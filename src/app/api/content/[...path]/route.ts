import { NextResponse, type NextRequest } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/content/{relativePath} — Serves PDF files from the local content/ directory.
 * This is the development-mode content serving strategy.
 * In production, this would be replaced by Supabase Storage signed URLs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: 'No path specified' }, { status: 400 });
  }

  // Reconstruct the relative path from segments
  const relativePath = pathSegments.join('/');

  // Security: prevent directory traversal
  if (relativePath.includes('..') || relativePath.includes('~')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  const contentDir = join(process.cwd(), 'content');
  const filePath = join(contentDir, relativePath);

  // Ensure the resolved path is still within content/
  if (!filePath.startsWith(contentDir)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${pathSegments[pathSegments.length - 1]}"`,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
