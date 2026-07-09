import { NextResponse, type NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ContentMetadata } from '@/features/content-scanner/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase().trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const indexPath = join(process.cwd(), 'content', 'metadata', 'content-index.json');
  if (!existsSync(indexPath)) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(data);
    const resources: ContentMetadata[] = parsed.resources ?? [];

    // Search across multiple fields
    const results = resources
      .filter(r => r.status === 'active' && r.isLatest)
      .filter(r => {
        const searchable = [
          r.fileName,
          r.subject,
          r.reading,
          r.provider,
          r.topic,
          r.resourceType,
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 20);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
