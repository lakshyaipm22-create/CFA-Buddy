import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAIProviderConfig } from '@/features/ai-explanations/utils/ai-provider';
import { streamExplanation } from '@/features/ai-explanations/utils/stream-ai';
import type { ExplainRequest } from '@/features/ai-explanations/types';

/**
 * Simple in-memory rate limiter: per-IP, 10 requests per 60 seconds.
 * Uses a sliding window approach with automatic cleanup.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodically clean up stale entries (every 5 minutes)
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

function isRateLimited(ip: string): boolean {
  cleanupStaleEntries();
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const entry = rateLimitStore.get(ip);
  if (!entry) {
    rateLimitStore.set(ip, { timestamps: [now] });
    return false;
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

const explainRequestSchema = z.object({
  questionText: z.string().min(1).max(2000),
  answerChoices: z.array(
    z.object({
      label: z.string().min(1),
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })
  ).min(2).max(10),
  selectedAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();
    const parsed = explainRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const config = getAIProviderConfig();

    if (!config) {
      return NextResponse.json(
        {
          explanation:
            'AI explanations require an API key. Check the documentation for setup instructions.',
          streaming: false,
        },
        { status: 200 }
      );
    }

    const explainRequest: ExplainRequest = parsed.data;
    const stream = await streamExplanation(config, explainRequest);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: message },
      { status: 500 }
    );
  }
}
