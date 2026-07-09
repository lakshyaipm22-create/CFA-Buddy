#!/usr/bin/env node
/**
 * CFA Buddy — Content Scanner CLI
 * 
 * Usage:
 *   npm run scan:content              # Incremental scan
 *   npm run scan:content -- --full    # Full rescan (recomputes all checksums)
 *   npm run scan:content -- --verbose # Verbose logging
 *   npm run scan:content -- --db      # Sync results to database
 */

import { ContentScanner } from '../features/content-scanner/scanner';
import type { ScanReport, ResourceType } from '../features/content-scanner/types';

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes('--full');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const syncDb = args.includes('--db');
  const contentDir = args.find(a => a.startsWith('--dir='))?.split('=')[1] ?? './content';

  console.log('\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551    CFA Buddy \u2014 Content Scanner       \u2551');
  console.log('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n');
  console.log(`  Mode: ${full ? 'FULL SCAN' : 'INCREMENTAL'}`);
  console.log(`  Content directory: ${contentDir}`);
  console.log(`  Database sync: ${syncDb ? 'Yes' : 'No'}`);
  console.log('');

  const scanner = new ContentScanner({
    contentDir,
    full,
    syncDb,
    verbose,
    concurrency: 10,
  });

  const { report } = await scanner.scan();
  printReport(report);

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

function printReport(report: ScanReport) {
  const duration = report.durationMs < 1000
    ? `${report.durationMs}ms`
    : `${(report.durationMs / 1000).toFixed(1)}s`;

  console.log('\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('\u2502          SCAN REPORT                 \u2502');
  console.log('\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  console.log(`\u2502  Duration:      ${duration.padEnd(20)}\u2502`);
  console.log(`\u2502  Total files:   ${String(report.totalFiles).padEnd(20)}\u2502`);
  console.log(`\u2502  New:           ${String(report.newFiles).padEnd(20)}\u2502`);
  console.log(`\u2502  Modified:      ${String(report.modifiedFiles).padEnd(20)}\u2502`);
  console.log(`\u2502  Deleted:       ${String(report.deletedFiles).padEnd(20)}\u2502`);
  console.log(`\u2502  Unchanged:     ${String(report.unchangedFiles).padEnd(20)}\u2502`);
  console.log(`\u2502  Duplicates:    ${String(report.duplicates).padEnd(20)}\u2502`);
  console.log(`\u2502  Errors:        ${String(report.errors.length).padEnd(20)}\u2502`);
  console.log(`\u2502  Missing pairs: ${String(report.missingPairs.length).padEnd(20)}\u2502`);
  console.log('\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  console.log('\u2502  BY RESOURCE TYPE                    \u2502');
  console.log('\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');

  const typeOrder: ResourceType[] = [
    'curriculum', 'schweser-notes', 'ift-notes', 'mark-meldrum-notes',
    'fintree-notes', 'question-bank', 'answer-key', 'mock-exam',
    'formula-sheet', 'personal-note', 'unknown',
  ];

  for (const type of typeOrder) {
    const count = report.byResourceType[type];
    if (count && count > 0) {
      console.log(`\u2502  ${type.padEnd(20)} ${String(count).padStart(4)}          \u2502`);
    }
  }

  if (Object.keys(report.byProvider).length > 0) {
    console.log('\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
    console.log('\u2502  BY PROVIDER                         \u2502');
    console.log('\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
    for (const [provider, count] of Object.entries(report.byProvider).sort((a, b) => b[1] - a[1])) {
      console.log(`\u2502  ${provider.padEnd(20)} ${String(count).padStart(4)}          \u2502`);
    }
  }

  console.log('\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');

  if (report.errors.length > 0) {
    console.log('\n  ERRORS:');
    for (const err of report.errors) {
      console.log(`  [ERROR] ${err.filePath}: ${err.error}`);
    }
  }

  if (report.missingPairs.length > 0) {
    console.log('\n  MISSING PAIRS (answer files without matching question file):');
    for (const path of report.missingPairs.slice(0, 10)) {
      console.log(`  [WARN] ${path}`);
    }
    if (report.missingPairs.length > 10) {
      console.log(`  ... and ${report.missingPairs.length - 10} more`);
    }
  }

  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
