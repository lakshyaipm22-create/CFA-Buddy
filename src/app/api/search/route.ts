import { NextResponse, type NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ContentMetadata } from '@/features/content-scanner/types';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResultItem {
  id: string;
  type: 'resource' | 'question' | 'note' | 'topic';
  title: string;
  subtitle: string;
  href: string;
  highlight?: string;
}

interface GroupedSearchResults {
  results: SearchResultItem[];
  groups: {
    resources: SearchResultItem[];
    questions: SearchResultItem[];
    notes: SearchResultItem[];
    topics: SearchResultItem[];
  };
  totalCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string, maxLen = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);

  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 60);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q')?.toLowerCase().trim();

  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json({ results: [], groups: { resources: [], questions: [], notes: [], topics: [] }, totalCount: 0 });
  }

  // Cap query length to prevent expensive full-table scans with overly long input
  const query = rawQuery.slice(0, 200);

  const resources: SearchResultItem[] = [];
  const questions: SearchResultItem[] = [];
  const notes: SearchResultItem[] = [];
  const topics: SearchResultItem[] = [];

  // ─── DB Full-Text Search (when available) ──────────────────────────────────

  // Read authenticated user for note filtering
  let currentUserId: string | null = null;
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  }

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      // Search questions by text content
      const dbQuestions = await prisma.question.findMany({
        where: {
          OR: [
            { questionText: { contains: query, mode: 'insensitive' } },
          ],
          verificationStatus: 'approved',
        },
        include: { topic: true },
        take: 10,
      });

      for (const q of dbQuestions) {
        questions.push({
          id: q.id,
          type: 'question',
          title: q.questionText.slice(0, 100) + (q.questionText.length > 100 ? '...' : ''),
          subtitle: `${q.topic?.name ?? 'General'} - ${q.difficulty}`,
          href: '/questions',
          highlight: highlightMatch(q.questionText, query),
        });
      }

      // Search notes - only for authenticated users, filtered by userId
      if (currentUserId) {
        const dbNotes = await prisma.note.findMany({
          where: {
            userId: currentUserId,
            content: { contains: query, mode: 'insensitive' },
          },
          take: 10,
        });

        for (const n of dbNotes) {
          notes.push({
            id: n.id,
            type: 'note',
            title: n.content.slice(0, 80) + (n.content.length > 80 ? '...' : ''),
            subtitle: 'Note',
            href: '/notes',
            highlight: highlightMatch(n.content, query),
          });
        }
      }

      // Search topics
      const dbTopics = await prisma.topic.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        include: { reading: { include: { subject: true } } },
        take: 10,
      });

      for (const t of dbTopics) {
        topics.push({
          id: t.id,
          type: 'topic',
          title: t.name,
          subtitle: t.reading?.subject?.name ?? 'Topic',
          href: `/topics/${t.id}`,
        });
      }
    } catch {
      // DB search failed; fall through to client-side content search
    }
  }

  // ─── Client-side Fallback: Search sample questions ─────────────────────────

  if (questions.length === 0) {
    const matchedQuestions = sampleQuestions
      .filter((q) => {
        const searchable = [q.questionText, q.subject, q.topic ?? ''].join(' ').toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 10);

    for (const q of matchedQuestions) {
      questions.push({
        id: q.id,
        type: 'question',
        title: q.questionText.slice(0, 100) + (q.questionText.length > 100 ? '...' : ''),
        subtitle: `${q.subject} - ${q.difficulty}`,
        href: '/questions',
        highlight: highlightMatch(q.questionText, query),
      });
    }
  }

  // ─── Search Resources from content-index.json ──────────────────────────────

  const indexPath = join(process.cwd(), 'content', 'metadata', 'content-index.json');
  if (existsSync(indexPath)) {
    try {
      const data = await readFile(indexPath, 'utf-8');
      const parsed = JSON.parse(data);
      const allResources: ContentMetadata[] = parsed.resources ?? [];

      const matchedResources = allResources
        .filter((r) => r.status === 'active' && r.isLatest)
        .filter((r) => {
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
        .slice(0, 10);

      for (const r of matchedResources) {
        resources.push({
          id: r.id,
          type: 'resource',
          title: r.fileName,
          subtitle: [r.provider, r.subject].filter(Boolean).join(' - '),
          href: `/resources/${r.id}`,
          highlight: r.reading ?? undefined,
        });
      }
    } catch {
      // Ignore file read errors
    }
  }

  // ─── Build grouped response ────────────────────────────────────────────────

  const allResults = [...resources, ...questions, ...notes, ...topics];

  const response: GroupedSearchResults = {
    results: allResults.slice(0, 20),
    groups: {
      resources: resources.slice(0, 5),
      questions: questions.slice(0, 5),
      notes: notes.slice(0, 5),
      topics: topics.slice(0, 5),
    },
    totalCount: allResults.length,
  };

  return NextResponse.json(response);
}
