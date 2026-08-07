import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAIProviderConfig } from '@/features/ai-explanations/utils/ai-provider';
import { buildContext } from '@/features/ai-tutor/utils/context-retriever';
import { buildChatPrompt } from '@/features/ai-tutor/utils/chat-prompt-builder';
import type { SourceReference } from '@/features/ai-tutor/types';

/**
 * Simple in-memory rate limiter: per-IP, 15 requests per 60 seconds.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

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

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const tutorRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  sessionId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();
    const parsed = tutorRequestSchema.safeParse(body);

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
          error: 'AI tutor is not configured',
          message:
            'AI tutor requires an API key. Configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable to enable AI-powered tutoring.',
        },
        { status: 503 }
      );
    }

    const { messages } = parsed.data;
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const query = lastUserMessage?.content ?? '';

    // Build RAG context from the formula and question database
    const context = buildContext(query);

    // Build sources for the response header
    const sources: SourceReference[] = [
      ...context.formulas.map((f) => ({
        type: 'formula' as const,
        id: f.id,
        title: f.name,
        relevanceScore: f.relevanceScore,
      })),
      ...context.questions.slice(0, 3).map((q) => ({
        type: 'question' as const,
        id: q.id,
        title: q.topic ?? q.subject,
        relevanceScore: q.relevanceScore,
      })),
    ];

    // Build the full prompt with system message and history
    const chatMessages = buildChatPrompt(context, messages);

    // Stream from the appropriate provider
    const stream = await streamFromProvider(config, chatMessages);

    const headers: HeadersInit = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    };

    if (sources.length > 0) {
      headers['X-Sources'] = JSON.stringify(sources);
    }

    return new Response(stream, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate response', details: message },
      { status: 500 }
    );
  }
}

/**
 * Streams a response from the configured AI provider.
 */
async function streamFromProvider(
  config: { provider: string; apiKey: string; model: string },
  messages: { role: string; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  if (config.provider === 'anthropic') {
    return streamAnthropic(config, messages);
  }
  return streamOpenAI(config, messages);
}

async function streamOpenAI(
  config: { apiKey: string; model: string },
  messages: { role: string; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('OpenAI API returned no response body');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

async function streamAnthropic(
  config: { apiKey: string; model: string },
  messages: { role: string; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  const systemMessage = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system: systemMessage?.content ?? '',
      messages: chatMessages,
      stream: true,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Anthropic API returned no response body');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
