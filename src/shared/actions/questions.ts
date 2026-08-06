'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const submitAnswerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  selectedAnswer: z.string().min(1),
  confidence: z.enum(['Guess', 'ThinkSo', 'Certain']),
  timeSpentSeconds: z.number().int().min(0),
  correct: z.boolean(),
  errorClassification: z
    .enum([
      'DidntKnow',
      'ForgotFormula',
      'CalculationMistake',
      'MisreadQuestion',
      'Careless',
      'TimePressure',
      'Unclassified',
    ])
    .optional(),
});

const createSessionSchema = z.object({
  mode: z.enum([
    'Topic',
    'Subject',
    'Mixed',
    'QuickTopic',
    'AdaptiveRetest',
    'Random',
    'WeakTopic',
    'Mock',
  ]),
  config: z.object({
    questionCount: z.number().int().min(1).max(200),
    timeLimit: z.number().int().min(1).nullable(),
    subject: z.string().optional(),
    topic: z.string().optional(),
    difficulty: z.string().optional(),
    provider: z.string().optional(),
  }),
  questionIds: z.array(z.string().min(1)).min(1),
});

const completeSessionSchema = z.object({
  sessionId: z.string().min(1),
});

const bookmarkQuestionSchema = z.object({
  questionId: z.string().min(1),
  bookmarked: z.boolean(),
});

const flagQuestionSchema = z.object({
  questionId: z.string().min(1),
  reason: z.string().min(1).max(500).optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttemptResult {
  id: string;
  questionId: string;
  selectedAnswer: string;
  correct: boolean;
  confidence: string;
  timeSpentSeconds: number;
}

interface SessionResult {
  id: string;
  mode: string;
  status: string;
  startedAt: string;
  totalQuestions: number;
  expiresAt: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function submitAnswer(
  input: z.infer<typeof submitAnswerSchema>
): Promise<ActionResult<AttemptResult>> {
  const validated = submitAnswerSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const userId = supabase
    ? (await supabase.auth.getUser()).data.user?.id
    : null;

  if (isDatabaseAvailable() && !userId) {
    return { success: false, error: 'Authentication required.' };
  }

  const attemptId = crypto.randomUUID();

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const attempt = await prisma.questionAttempt.create({
        data: {
          id: attemptId,
          sessionId: validated.data.sessionId,
          questionId: validated.data.questionId,
          userId: userId!,
          selectedAnswer: validated.data.selectedAnswer,
          confidence: validated.data.confidence,
          timeSpentSeconds: validated.data.timeSpentSeconds,
          correct: validated.data.correct,
          errorClassification: validated.data.errorClassification ?? null,
        },
      });
      return {
        success: true,
        data: {
          id: attempt.id,
          questionId: attempt.questionId,
          selectedAnswer: attempt.selectedAnswer,
          correct: attempt.correct,
          confidence: attempt.confidence,
          timeSpentSeconds: attempt.timeSpentSeconds,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback
  return {
    success: true,
    data: {
      id: attemptId,
      questionId: validated.data.questionId,
      selectedAnswer: validated.data.selectedAnswer,
      correct: validated.data.correct,
      confidence: validated.data.confidence,
      timeSpentSeconds: validated.data.timeSpentSeconds,
    },
  };
}

export async function createSession(
  input: z.infer<typeof createSessionSchema>
): Promise<ActionResult<SessionResult>> {
  const validated = createSessionSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const userId = supabase
    ? (await supabase.auth.getUser()).data.user?.id
    : null;

  if (isDatabaseAvailable() && !userId) {
    return { success: false, error: 'Authentication required.' };
  }

  const sessionId = crypto.randomUUID();
  const now = new Date();
  const timeLimit = validated.data.config.timeLimit;
  const expiresAt = timeLimit
    ? new Date(now.getTime() + timeLimit * 60 * 1000)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: 24h

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const session = await prisma.questionSession.create({
        data: {
          id: sessionId,
          userId: userId!,
          mode: validated.data.mode === 'Mock' ? 'Random' : validated.data.mode,
          config: validated.data.config,
          status: 'Active',
          totalQuestions: validated.data.questionIds.length,
          expiresAt,
        },
      });
      return {
        success: true,
        data: {
          id: session.id,
          mode: session.mode,
          status: session.status,
          startedAt: session.startedAt.toISOString(),
          totalQuestions: session.totalQuestions,
          expiresAt: session.expiresAt.toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback
  return {
    success: true,
    data: {
      id: sessionId,
      mode: validated.data.mode,
      status: 'active',
      startedAt: now.toISOString(),
      totalQuestions: validated.data.questionIds.length,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

export async function completeSession(
  input: z.infer<typeof completeSessionSchema>
): Promise<ActionResult<{ completedAt: string }>> {
  const validated = completeSessionSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const userId = supabase
    ? (await supabase.auth.getUser()).data.user?.id
    : null;

  if (isDatabaseAvailable() && !userId) {
    return { success: false, error: 'Authentication required.' };
  }

  const completedAt = new Date().toISOString();

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      await prisma.questionSession.update({
        where: { id: validated.data.sessionId },
        data: { status: 'Completed', completedAt: new Date(completedAt) },
      });
      return { success: true, data: { completedAt } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  return { success: true, data: { completedAt } };
}

export async function bookmarkQuestion(
  input: z.infer<typeof bookmarkQuestionSchema>
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const validated = bookmarkQuestionSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const userId = supabase
    ? (await supabase.auth.getUser()).data.user?.id
    : null;

  if (isDatabaseAvailable() && !userId) {
    return { success: false, error: 'Authentication required.' };
  }

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      if (validated.data.bookmarked) {
        await prisma.questionBookmark.upsert({
          where: {
            userId_questionId: {
              userId: userId!,
              questionId: validated.data.questionId,
            },
          },
          update: {},
          create: {
            userId: userId!,
            questionId: validated.data.questionId,
          },
        });
      } else {
        await prisma.questionBookmark.deleteMany({
          where: {
            userId: userId!,
            questionId: validated.data.questionId,
          },
        });
      }
      return { success: true, data: { bookmarked: validated.data.bookmarked } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  return { success: true, data: { bookmarked: validated.data.bookmarked } };
}

export async function flagQuestion(
  input: z.infer<typeof flagQuestionSchema>
): Promise<ActionResult<{ flagged: boolean }>> {
  const validated = flagQuestionSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    // Flagging requires auth - cannot flag anonymously in production
    return { success: false, error: 'Authentication required to flag questions.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Flagging updates the question's verification status to "flagged"
  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      await prisma.question.update({
        where: { id: validated.data.questionId },
        data: { verificationStatus: 'flagged' },
      });
      return { success: true, data: { flagged: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // Without DB, flagging is a no-op but reported as success
  return { success: true, data: { flagged: true } };
}
