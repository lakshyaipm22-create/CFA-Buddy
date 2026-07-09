import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { ContentScanner } from '../scanner';

const TEST_CONTENT_DIR = join(process.cwd(), 'test-content-fixture');

async function createTestFile(relativePath: string, content = 'fake-pdf-content'): Promise<void> {
  const fullPath = join(TEST_CONTENT_DIR, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  // Write a minimal PDF-like file (starts with %PDF to pass any future magic-byte checks)
  await writeFile(fullPath, `%PDF-1.4 ${content}`);
}

async function deleteTestFile(relativePath: string): Promise<void> {
  const fullPath = join(TEST_CONTENT_DIR, relativePath);
  await rm(fullPath, { force: true });
}

describe('ContentScanner — Incremental Scan Logic', () => {
  beforeEach(async () => {
    await mkdir(join(TEST_CONTENT_DIR, 'metadata'), { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_CONTENT_DIR, { recursive: true, force: true });
  });

  it('first scan: all files are new, none deleted', async () => {
    await createTestFile('curriculum/level1/test-v1.pdf');
    await createTestFile('curriculum/level1/test-v2.pdf');
    await createTestFile('notes/level1/ift/test-note.pdf');

    const scanner = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report } = await scanner.scan();

    expect(report.totalFiles).toBe(3);
    expect(report.newFiles).toBe(3);
    expect(report.deletedFiles).toBe(0);
    expect(report.unchangedFiles).toBe(0);
    expect(report.modifiedFiles).toBe(0);
  });

  it('second scan with no changes: all files unchanged, none new or deleted', async () => {
    await createTestFile('curriculum/level1/test-v1.pdf');
    await createTestFile('curriculum/level1/test-v2.pdf');

    // First scan
    const scanner1 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    await scanner1.scan();

    // Second scan (same files, no changes)
    const scanner2 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report } = await scanner2.scan();

    expect(report.totalFiles).toBe(2);
    expect(report.newFiles).toBe(0);
    expect(report.deletedFiles).toBe(0);
    expect(report.unchangedFiles).toBe(2);
    expect(report.modifiedFiles).toBe(0);
  });

  it('incremental scan with one deleted file: detects deletion correctly', async () => {
    await createTestFile('curriculum/level1/keep.pdf');
    await createTestFile('curriculum/level1/delete-me.pdf');

    // First scan
    const scanner1 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    await scanner1.scan();

    // Delete one file
    await deleteTestFile('curriculum/level1/delete-me.pdf');

    // Second scan
    const scanner2 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report } = await scanner2.scan();

    expect(report.totalFiles).toBe(1); // Only active files
    expect(report.newFiles).toBe(0);
    expect(report.deletedFiles).toBe(1);
    expect(report.unchangedFiles).toBe(1);
  });

  it('incremental scan with one new file: detects addition correctly', async () => {
    await createTestFile('curriculum/level1/existing.pdf');

    // First scan
    const scanner1 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    await scanner1.scan();

    // Add a new file
    await createTestFile('notes/level1/ift/new-file.pdf', 'new content');

    // Second scan
    const scanner2 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report } = await scanner2.scan();

    expect(report.totalFiles).toBe(2);
    expect(report.newFiles).toBe(1);
    expect(report.deletedFiles).toBe(0);
    expect(report.unchangedFiles).toBe(1);
  });

  it('full scan re-processes all files even if unchanged', async () => {
    await createTestFile('curriculum/level1/file1.pdf');
    await createTestFile('curriculum/level1/file2.pdf');

    // First scan
    const scanner1 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    await scanner1.scan();

    // Full rescan (no file changes, but --full forces reprocessing)
    const scanner2 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: true });
    const { report } = await scanner2.scan();

    expect(report.totalFiles).toBe(2);
    expect(report.deletedFiles).toBe(0);
    expect(report.unchangedFiles).toBe(0); // Full scan reprocesses everything
    // All files are "new" relative to processedCount logic, but they already
    // existed in the index so newFiles should still be 0
    expect(report.newFiles).toBe(0);
  });

  it('a file cannot be simultaneously new and deleted in the same scan', async () => {
    await createTestFile('curriculum/level1/file.pdf');

    const scanner = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report, resources } = await scanner.scan();

    // No resource should have status='deleted' while also being counted as new
    const deletedPaths = new Set(
      resources.filter(r => r.status === 'deleted').map(r => r.relativePath)
    );
    const newPaths = resources.filter(r => {
      return r.status !== 'deleted';
    }).map(r => r.relativePath);

    for (const newPath of newPaths) {
      expect(deletedPaths.has(newPath)).toBe(false);
    }

    expect(report.newFiles + report.deletedFiles).toBeLessThanOrEqual(report.totalFiles + report.deletedFiles);
  });

  it('index file only contains active entries, never deleted ones', async () => {
    await createTestFile('curriculum/level1/keep.pdf');
    await createTestFile('curriculum/level1/will-delete.pdf');

    // First scan indexes both files
    const scanner1 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    await scanner1.scan();

    // Delete one file
    await deleteTestFile('curriculum/level1/will-delete.pdf');

    // Second scan
    const scanner2 = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report } = await scanner2.scan();

    expect(report.deletedFiles).toBe(1);

    // Read the written index and verify it only contains active entries
    const indexPath = join(TEST_CONTENT_DIR, 'metadata', 'content-index.json');
    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));
    
    expect(indexData.totalResources).toBe(1);
    expect(indexData.resources.length).toBe(1);
    expect(indexData.resources[0].relativePath).toBe('curriculum/level1/keep.pdf');
    // No entry should have status 'deleted'
    expect(indexData.resources.every((r: { status: string }) => r.status === 'active')).toBe(true);
  });

  it('totalResources in written index always equals files on disk', async () => {
    await createTestFile('a.pdf');
    await createTestFile('b.pdf');
    await createTestFile('c.pdf');

    const scanner = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    await scanner.scan();

    const indexPath = join(TEST_CONTENT_DIR, 'metadata', 'content-index.json');
    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));
    
    expect(indexData.totalResources).toBe(3);
    expect(indexData.resources.length).toBe(3);
  });

  it('self-heals from a corrupt index containing deleted entries', async () => {
    await createTestFile('curriculum/level1/file1.pdf');
    await createTestFile('curriculum/level1/file2.pdf');

    // Simulate a corrupt index with deleted entries (from old buggy scanner)
    const corruptIndex = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalResources: 4,
      resources: [
        // Two "active" entries matching real files
        { relativePath: 'curriculum/level1/file1.pdf', status: 'active', fileSize: 25, modifiedTime: '', checksum: 'a', id: '1', provider: null, level: null, subject: null, reading: null, readingNumber: null, topic: null, year: null, version: null, isLatest: true, filePath: '', fileName: 'file1.pdf', extension: 'pdf', resourceType: 'unknown', pairedWith: null, discoveredAt: '', lastScannedAt: '' },
        { relativePath: 'curriculum/level1/file2.pdf', status: 'active', fileSize: 25, modifiedTime: '', checksum: 'b', id: '2', provider: null, level: null, subject: null, reading: null, readingNumber: null, topic: null, year: null, version: null, isLatest: true, filePath: '', fileName: 'file2.pdf', extension: 'pdf', resourceType: 'unknown', pairedWith: null, discoveredAt: '', lastScannedAt: '' },
        // Two "deleted" entries from old buggy code (should be discarded)
        { relativePath: 'old/deleted/file3.pdf', status: 'deleted', fileSize: 100, modifiedTime: '', checksum: 'c', id: '3', provider: null, level: null, subject: null, reading: null, readingNumber: null, topic: null, year: null, version: null, isLatest: true, filePath: '', fileName: 'file3.pdf', extension: 'pdf', resourceType: 'unknown', pairedWith: null, discoveredAt: '', lastScannedAt: '' },
        { relativePath: 'old/deleted/file4.pdf', status: 'deleted', fileSize: 100, modifiedTime: '', checksum: 'd', id: '4', provider: null, level: null, subject: null, reading: null, readingNumber: null, topic: null, year: null, version: null, isLatest: true, filePath: '', fileName: 'file4.pdf', extension: 'pdf', resourceType: 'unknown', pairedWith: null, discoveredAt: '', lastScannedAt: '' },
      ],
    };

    const indexPath = join(TEST_CONTENT_DIR, 'metadata', 'content-index.json');
    await writeFile(indexPath, JSON.stringify(corruptIndex, null, 2));

    // Run scanner — it should discard the deleted entries and NOT report them
    const scanner = new ContentScanner({ contentDir: TEST_CONTENT_DIR, full: false });
    const { report } = await scanner.scan();

    // The two deleted entries should be silently discarded, not counted
    expect(report.totalFiles).toBe(2);
    expect(report.deletedFiles).toBe(0); // No REAL deletions happened

    // Verify written index is clean — no 'deleted' entries survive
    const writtenIndex = JSON.parse(await readFile(indexPath, 'utf-8'));
    expect(writtenIndex.totalResources).toBe(2);
    expect(writtenIndex.resources.length).toBe(2);
    // The key invariant: no resource has status 'deleted' in the written index
    expect(writtenIndex.resources.some((r: { status: string }) => r.status === 'deleted')).toBe(false);
  });
});
