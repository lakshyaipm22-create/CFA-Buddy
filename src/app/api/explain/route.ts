import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAIProviderConfig } from '@/features/ai-explanations/utils/ai-provider';
import { streamExplanation } from '@/features/ai-explanations/utils/stream-ai';
import type { ExplainRequest } from '@/features/ai-explanations/types';

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
