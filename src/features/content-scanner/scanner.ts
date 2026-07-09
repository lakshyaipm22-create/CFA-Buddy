import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

import type {
  ContentMetadata,
  ScanOptions,
  ScanReport,
  ScanState,
} from './types';
import { discoverFiles, type DiscoveredFile } from './utils/file-discovery';
import { computeChecksum } from './utils/checksum';
import { findParser } from './parsers';
import { inferProvider, inferLevel } from './config/provider-mapping';
import { detectPairs } from './utils/pair-detector';
import { detectVersions } from './utils/version-detector';
import { ScannerLogger } from './utils/logger';
import { createHash } from 'crypto';

const INDEX_VERSION = '1.0.0';

/**
 * ContentScanner — The core scanning engine.
 * 
 * This is a reusable library, NOT tied to the CLI.
 * Can be invoked from: CLI, Admin UI API route, tests, background jobs.
 *
 * Invariants:
 * 1. content-index.json ONLY contains entries for files that currently exist on disk.
 * 2. Deleted files are reported in the scan report but NEVER written to the index.
 * 3. The index is a snapshot of current disk state, not a changelog or history.
 * 4. totalResources in the written JSON always equals the number of active files on disk.
 * 5. Running the scanner twice with no file changes produces: New=0, Modified=0, Deleted=0, Unchanged=N.
 */
export class ContentScanner {
  private options: ScanOptions;
  private logger: ScannerLogger;
  private existingIndex: ContentMetadata[] = [];
  private scanState: ScanState | null = null;

  constructor(options: Partial<ScanOptions> = {}) {
    this.options = {
      contentDir: options.contentDir ?? './content',
      full: options.full ?? false,
      syncDb: options.syncDb ?? false,
      concurrency: options.concurrency ?? 10,
      verbose: options.verbose ?? false,
    };
    this.logger = new ScannerLogger(this.options.verbose);
  }

  /**
   * Run the full scan pipeline.
   * Returns a ScanReport with complete results.
   */
  async scan(): Promise<{ report: ScanReport; resources: ContentMetadata[] }> {
    const startTime = Date.now();
    this.logger.info('Starting content scan', { contentDir: this.options.contentDir, full: this.options.full });

    // Step 1: Verify content directory exists
    if (!existsSync(this.options.contentDir)) {
      this.logger.warn('Content directory not found', { path: this.options.contentDir });
      return { report: this.buildEmptyReport(startTime), resources: [] };
    }

    // Step 2: Load existing index (only active entries — deleted are never stored)
    await this.loadExistingState();
    const previousIndex = new Map(
      this.existingIndex.map((r) => [r.relativePath, r])
    );

    // Step 3: Discover all PDF files currently on disk
    this.logger.info('Discovering files...');
    const discovered = await discoverFiles(this.options.contentDir);
    this.logger.info(`Found ${discovered.length} PDF files`);
    const discoveredPaths = new Set(discovered.map((f) => f.relativePath));

    // Step 4: Classify each discovered file as new, modified, or unchanged
    const newFiles: DiscoveredFile[] = [];
    const modifiedFiles: DiscoveredFile[] = [];
    const unchangedPaths: string[] = [];

    for (const file of discovered) {
      const existing = previousIndex.get(file.relativePath);
      if (!existing) {
        newFiles.push(file);
      } else if (this.options.full || existing.fileSize !== file.fileSize || existing.modifiedTime !== file.modifiedTime) {
        modifiedFiles.push(file);
      } else {
        unchangedPaths.push(file.relativePath);
      }
    }

    // Step 5: Detect deleted files (in previous index but not on disk)
    const deletedPaths: string[] = [];
    for (const [path] of previousIndex) {
      if (!discoveredPaths.has(path)) {
        deletedPaths.push(path);
      }
    }

    this.logger.info(`New: ${newFiles.length}, Modified: ${modifiedFiles.length}, Unchanged: ${unchangedPaths.length}, Deleted: ${deletedPaths.length}`);

    // Step 6: Process new and modified files (compute checksums + extract metadata)
    const toProcess = [...newFiles, ...modifiedFiles];
    const processed = await this.processFiles(toProcess);

    // Step 7: Build the final index (ONLY active entries — never store deleted)
    const finalResources: ContentMetadata[] = [];

    // Add newly processed entries
    for (const entry of processed) {
      finalResources.push(entry);
    }

    // Add unchanged entries from previous index
    for (const path of unchangedPaths) {
      const existing = previousIndex.get(path);
      if (existing) {
        existing.lastScannedAt = new Date().toISOString();
        finalResources.push(existing);
      }
    }

    // Step 8: Detect paired files
    const missingPairs = detectPairs(finalResources);

    // Step 9: Detect versions and mark latest
    detectVersions(finalResources);

    // Step 10: Write index (only active entries) and scan state
    await this.writeIndex(finalResources);
    await this.writeScanState(finalResources.length);

    // Step 11: Build report
    const report: ScanReport = {
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      totalFiles: finalResources.length,
      newFiles: newFiles.length,
      modifiedFiles: modifiedFiles.length,
      deletedFiles: deletedPaths.length,
      unchangedFiles: unchangedPaths.length,
      duplicates: this.countDuplicates(finalResources),
      errors: this.logger.getErrors().map((e) => ({
        filePath: (e.data?.filePath as string) ?? '',
        error: e.message,
        timestamp: e.timestamp,
      })),
      missingPairs,
      byResourceType: this.countByField(finalResources, 'resourceType'),
      byProvider: this.countByField(finalResources, 'provider'),
      byLevel: this.countByLevelField(finalResources),
    };

    this.logger.success('Scan complete', {
      total: report.totalFiles,
      new: report.newFiles,
      modified: report.modifiedFiles,
      deleted: report.deletedFiles,
      errors: report.errors.length,
    });

    return { report, resources: finalResources };
  }

  private countDuplicates(resources: ContentMetadata[]): number {
    const checksumCounts = new Map<string, number>();
    for (const r of resources) {
      checksumCounts.set(r.checksum, (checksumCounts.get(r.checksum) ?? 0) + 1);
    }
    return [...checksumCounts.values()].filter((c) => c > 1).length;
  }

  private countByField(resources: ContentMetadata[], field: 'resourceType' | 'provider'): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      const value = r[field];
      if (value) counts[value] = (counts[value] ?? 0) + 1;
    }
    return counts;
  }

  private countByLevelField(resources: ContentMetadata[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      if (r.level) counts[`Level ${r.level}`] = (counts[`Level ${r.level}`] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Process files with concurrency limit.
   * Extracts metadata and computes checksums.
   */
  private async processFiles(files: DiscoveredFile[]): Promise<ContentMetadata[]> {
    const results: ContentMetadata[] = [];
    const concurrency = this.options.concurrency;

    // Process in batches for concurrency control
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((file) => this.processOneFile(file))
      );
      results.push(...batchResults.filter((r): r is ContentMetadata => r !== null));
    }

    return results;
  }

  /**
   * Process a single file: extract metadata + compute checksum.
   */
  private async processOneFile(file: DiscoveredFile): Promise<ContentMetadata | null> {
    try {
      // Compute checksum
      const checksum = await computeChecksum(file.absolutePath);

      // Generate stable ID from relative path
      const id = createHash('sha256').update(file.relativePath).digest('hex').slice(0, 16);

      // Find matching parser
      const parser = findParser(file.relativePath);
      let extracted: Partial<ContentMetadata> = {};

      if (parser) {
        extracted = parser.extract(file.relativePath, file.fileName);
        this.logger.info(`Parsed: ${file.relativePath}`, { parser: parser.slug });
      } else {
        this.logger.warn(`No parser matched: ${file.relativePath}`);
      }

      // Infer provider from folder if parser didn't set it
      if (!extracted.provider) {
        const providerInfo = inferProvider(file.relativePath);
        if (providerInfo) {
          extracted.provider = providerInfo.slug;
        }
      }

      // Infer level from path if not set
      if (!extracted.level) {
        extracted.level = inferLevel(file.relativePath);
      }

      // Build unified metadata
      const metadata: ContentMetadata = {
        id,
        provider: extracted.provider ?? null,
        level: extracted.level ?? null,
        subject: extracted.subject ?? null,
        reading: extracted.reading ?? null,
        readingNumber: extracted.readingNumber ?? null,
        topic: extracted.topic ?? null,
        year: extracted.year ?? null,
        version: extracted.version ?? null,
        isLatest: true, // Will be updated by version detector
        filePath: file.absolutePath,
        relativePath: file.relativePath,
        fileName: file.fileName,
        extension: file.extension,
        fileSize: file.fileSize,
        modifiedTime: file.modifiedTime,
        checksum,
        resourceType: extracted.resourceType ?? 'unknown',
        status: 'active',
        pairedWith: null, // Will be updated by pair detector
        discoveredAt: new Date().toISOString(),
        lastScannedAt: new Date().toISOString(),
      };

      return metadata;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process: ${file.relativePath}`, { error: errMsg });
      return null;
    }
  }

  /**
   * Load existing index and scan state from disk.
   * Normalizes stored paths to forward slashes for cross-platform consistency.
   */
  private async loadExistingState(): Promise<void> {
    try {
      const indexPath = join(this.options.contentDir, 'metadata', 'content-index.json');

      if (existsSync(indexPath)) {
        const data = await readFile(indexPath, 'utf-8');
        const parsed = JSON.parse(data);
        const rawResources: ContentMetadata[] = parsed.resources ?? [];
        
        // Normalize stored paths to forward slashes AND filter out any
        // stale 'deleted' entries left by previous buggy scanner versions.
        // The current design never persists deleted entries, but old indexes
        // on disk may still contain them. Discard them on load to self-heal.
        this.existingIndex = rawResources
          .filter((r) => r.status !== 'deleted')
          .map((r) => ({
            ...r,
            relativePath: r.relativePath.replace(/\\/g, '/'),
          }));
        
        this.logger.info(`Loaded existing index: ${this.existingIndex.length} entries`);
      }
    } catch {
      this.existingIndex = [];
    }

    try {
      const statePath = join(this.options.contentDir, 'metadata', 'scan-state.json');
      if (existsSync(statePath)) {
        const data = await readFile(statePath, 'utf-8');
        this.scanState = JSON.parse(data);
      }
    } catch {
      this.scanState = null;
    }
  }

  /**
   * Write the content index to disk.
   */
  private async writeIndex(resources: ContentMetadata[]): Promise<void> {
    const indexPath = join(this.options.contentDir, 'metadata', 'content-index.json');
    await mkdir(dirname(indexPath), { recursive: true });

    const index = {
      version: INDEX_VERSION,
      generatedAt: new Date().toISOString(),
      totalResources: resources.length,
      resources,
    };

    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    this.logger.info(`Index written: ${indexPath}`);
  }

  /**
   * Write scan state to disk.
   */
  private async writeScanState(totalFiles: number): Promise<void> {
    const statePath = join(this.options.contentDir, 'metadata', 'scan-state.json');
    await mkdir(dirname(statePath), { recursive: true });

    const state: ScanState = {
      lastScanTimestamp: new Date().toISOString(),
      lastFullScanTimestamp: this.options.full
        ? new Date().toISOString()
        : (this.scanState?.lastFullScanTimestamp ?? new Date().toISOString()),
      totalFilesIndexed: totalFiles,
      version: INDEX_VERSION,
    };

    await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  private buildEmptyReport(startTime: number): ScanReport {
    return {
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      totalFiles: 0,
      newFiles: 0,
      modifiedFiles: 0,
      deletedFiles: 0,
      unchangedFiles: 0,
      duplicates: 0,
      errors: [],
      missingPairs: [],
      byResourceType: {},
      byProvider: {},
      byLevel: {},
    };
  }

  /** Get all log entries from this scan run */
  getLogEntries() {
    return this.logger.getEntries();
  }
}
