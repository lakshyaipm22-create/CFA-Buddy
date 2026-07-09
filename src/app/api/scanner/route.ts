import { NextResponse } from 'next/server';
import { ContentScanner } from '@/features/content-scanner';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/scanner — Returns the current scan status (reads content-index.json)
 */
export async function GET() {
  try {
    const indexPath = join(process.cwd(), 'content', 'metadata', 'content-index.json');
    const statePath = join(process.cwd(), 'content', 'metadata', 'scan-state.json');

    if (!existsSync(indexPath)) {
      return NextResponse.json({
        status: 'no-index',
        message: 'No content index found. Run a scan first.',
        totalFiles: 0,
        byResourceType: {},
        byProvider: {},
        lastScanTimestamp: null,
      });
    }

    const indexData = JSON.parse(await readFile(indexPath, 'utf-8'));
    const stateData = existsSync(statePath)
      ? JSON.parse(await readFile(statePath, 'utf-8'))
      : null;

    // Compute stats from the index
    const resources = indexData.resources ?? [];
    const byResourceType: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    let resolvedCount = 0;
    let unknownCount = 0;

    for (const r of resources) {
      // By resource type
      byResourceType[r.resourceType] = (byResourceType[r.resourceType] ?? 0) + 1;
      if (r.resourceType === 'unknown') unknownCount++;
      else resolvedCount++;

      // By provider
      if (r.provider) byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1;

      // By level
      if (r.level) byLevel[`Level ${r.level}`] = (byLevel[`Level ${r.level}`] ?? 0) + 1;
    }

    return NextResponse.json({
      status: 'ready',
      totalFiles: resources.length,
      resolvedCount,
      unknownCount,
      metadataResolutionPercent: resources.length > 0
        ? Math.round((resolvedCount / resources.length) * 100)
        : 0,
      byResourceType,
      byProvider,
      byLevel,
      lastScanTimestamp: stateData?.lastScanTimestamp ?? null,
      lastFullScanTimestamp: stateData?.lastFullScanTimestamp ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

/**
 * POST /api/scanner — Triggers a new content scan
 * Body: { full?: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const full = body.full === true;

    const scanner = new ContentScanner({
      contentDir: './content',
      full,
      verbose: false,
      concurrency: 10,
    });

    const { report } = await scanner.scan();

    return NextResponse.json({
      status: 'completed',
      report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
