import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

import type {
  ContentMetadata,
  ScanOptions,
  ScanReport,
  ScanState,
  ResourceType,
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

    // Step 2: Load existing index and scan state
    await this.loadExistingState();

    // Step 3: Discover all PDF files
    this.logger.info('Discovering files...');
    const discovered = await discoverFiles(this.options.contentDir);
    this.logger.info(`Found ${discovered.length} PDF files`);

    // Step 4: Determine which files need processing
    const { toProcess, unchanged } = this.filterFiles(discovered);
    this.logger.info(`Files to process: ${toProcess.length}, unchanged: ${unchanged.length}`);

    // Step 5: Process files (extract metadata + compute checksums)
    const processed = await this.processFiles(toProcess);

    // Step 6: Merge with unchanged files from existing index
    const allResources = this.mergeResults(processed, unchanged);

    // Step 7: Detect deleted files
    const deletedCount = this.markDeletedFiles(allResources, discovered);

    // Step 8: Detect paired files
    const missingPairs = detectPairs(allResources.filter(r => r.status !== 'deleted'));

    // Step 9: Detect versions and mark latest
    detectVersions(allResources.filter(r => r.status !== 'deleted'));

    // Step 10: Write index and state
    await this.writeIndex(allResources);
    await this.writeScanState(allResources.length);

    // Step 11: Build report
    const report = this.buildReport(startTime, allResources, toProcess.length, unchanged.length, deletedCount, missingPairs);

    this.logger.success('Scan complete', {
      total: report.totalFiles,
      new: report.newFiles,
      modified: report.modifiedFiles,
      deleted: report.deletedFiles,
      errors: report.errors.length,
    });

    return { report, resources: allResources };
  }

  /**
   * Filter files based on incremental scan logic.
   * Full scan: process everything.
   * Incremental: only process new/modified files (by size + mtime comparison).
   */
  private filterFiles(discovered: DiscoveredFile[]): {
    toProcess: DiscoveredFile[];
    unchanged: string[];
  } {
    if (this.options.full || this.existingIndex.length === 0) {
      return { toProcess: discovered, unchanged: [] };
    }

    const existingMap = new Map(
      this.existingIndex.map((r) => [r.relativePath, r])
    );

    const toProcess: DiscoveredFile[] = [];
    const unchanged: string[] = [];

    for (const file of discovered) {
      const existing = existingMap.get(file.relativePath);
      if (!existing) {
        // New file
        toProcess.push(file);
      } else if (
        existing.fileSize !== file.fileSize ||
        existing.modifiedTime !== file.modifiedTime
      ) {
        // Modified file (size or mtime changed)
        toProcess.push(file);
      } else {
        // Unchanged
        unchanged.push(file.relativePath);
      }
    }

    return { toProcess, unchanged };
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
   * Merge newly processed files with unchanged files from existing index.
   */
  private mergeResults(
    processed: ContentMetadata[],
    unchangedPaths: string[]
  ): ContentMetadata[] {
    const existingMap = new Map(
      this.existingIndex.map((r) => [r.relativePath, r])
    );

    const results: ContentMetadata[] = [...processed];

    // Add unchanged files from existing index
    for (const path of unchangedPaths) {
      const existing = existingMap.get(path);
      if (existing) {
        existing.lastScannedAt = new Date().toISOString();
        results.push(existing);
      }
    }

    return results;
  }

  /**
   * Mark files that were in the index but no longer on disk.
   */
  private markDeletedFiles(
    allResources: ContentMetadata[],
    discovered: DiscoveredFile[]
  ): number {
    const currentPaths = new Set(discovered.map((f) => f.relativePath));
    let deletedCount = 0;

    for (const existing of this.existingIndex) {
      if (!currentPaths.has(existing.relativePath)) {
        existing.status = 'deleted';
        existing.lastScannedAt = new Date().toISOString();
        allResources.push(existing);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Load existing index and scan state from disk.
   */
  private async loadExistingState(): Promise<void> {
    try {
      const actualPath = join(dirname(this.options.contentDir), 'content', 'metadata', 'content-index.json');

      if (existsSync(actualPath)) {
        const data = await readFile(actualPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.existingIndex = parsed.resources ?? [];
        this.logger.info(`Loaded existing index: ${this.existingIndex.length} entries`);
      }
    } catch {
      this.existingIndex = [];
    }

    try {
      const statePath = join(dirname(this.options.contentDir), 'content', 'metadata', 'scan-state.json');
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

  /**
   * Build the scan report.
   */
  private buildReport(
    startTime: number,
    resources: ContentMetadata[],
    processedCount: number,
    unchangedCount: number,
    deletedCount: number,
    missingPairs: string[]
  ): ScanReport {
    const activeResources = resources.filter((r) => r.status !== 'deleted');
    const newFiles = resources.filter((r) => {
      const wasExisting = this.existingIndex.some(
        (e) => e.relativePath === r.relativePath
      );
      return !wasExisting && r.status !== 'deleted';
    }).length;

    const byResourceType: Record<ResourceType, number> = {} as Record<ResourceType, number>;
    const byProvider: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    for (const r of activeResources) {
      byResourceType[r.resourceType] = (byResourceType[r.resourceType] ?? 0) + 1;
      if (r.provider) byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1;
      if (r.level) byLevel[`Level ${r.level}`] = (byLevel[`Level ${r.level}`] ?? 0) + 1;
    }

    // Detect duplicates (same checksum, different paths)
    const checksumCounts = new Map<string, number>();
    for (const r of activeResources) {
      checksumCounts.set(r.checksum, (checksumCounts.get(r.checksum) ?? 0) + 1);
    }
    const duplicates = [...checksumCounts.values()].filter((c) => c > 1).length;

    return {
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      totalFiles: activeResources.length,
      newFiles,
      modifiedFiles: processedCount - newFiles,
      deletedFiles: deletedCount,
      unchangedFiles: unchangedCount,
      duplicates,
      errors: this.logger.getErrors().map((e) => ({
        filePath: (e.data?.filePath as string) ?? '',
        error: e.message,
        timestamp: e.timestamp,
      })),
      missingPairs,
      byResourceType,
      byProvider,
      byLevel,
    };
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
      byResourceType: {} as Record<ResourceType, number>,
      byProvider: {},
      byLevel: {},
    };
  }

  /** Get all log entries from this scan run */
  getLogEntries() {
    return this.logger.getEntries();
  }
}
