'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const classifyErrorSchema = z.object({
  attemptId: z.string().min(1),
  errorClassification: z.enum([
    'DidntKnow',
    'ForgotFormula',
    'CalculationMistake',
    'MisreadQuestion',
    'Careless',
    'TimePressure',
    'Unclassified',
  ]),
});

const resolveMistakeSchema = z.object({
  mistakeId: z.string().min(1),
});

const createMistakeLogSchema = z.object({
  attemptId: z.string().min(1),
  topicId: z.string().min(1),
  conceptId: z.string().min(1).optional(),
  errorClassification: z.enum([
    'DidntKnow',
    'ForgotFormula',
    'CalculationMistake',
    'MisreadQuestion',
    'Careless',
    'TimePressure',
    'Unclassified',
  ]),
  confidence: z.enum(['Guess', 'ThinkSo', 'Certain']),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface MistakeLogResult {
  id: string;
  attemptId: string;
  topicId: string;
  errorClassification: string;
  confidence: string;
  resolved: boolean;
  repeatCount: number;
  createdAt: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function classifyError(
  input: z.infer<typeof classifyErrorSchema>
): Promise<ActionResult<{ attemptId: string; classification: string }>> {
  const validated = classifyErrorSchema.safeParse(input);
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
      // Use compound where to verify ownership - prevents classifying another user's attempt
      await prisma.questionAttempt.update({
        where: { id: validated.data.attemptId, userId: userId! },
        data: { errorClassification: validated.data.errorClassification },
      });
      return {
        success: true,
        data: {
          attemptId: validated.data.attemptId,
          classification: validated.data.errorClassification,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  return {
    success: true,
    data: {
      attemptId: validated.data.attemptId,
      classification: validated.data.errorClassification,
    },
  };
}

export async function resolveMistake(
  input: z.infer<typeof resolveMistakeSchema>
): Promise<ActionResult<{ resolved: boolean }>> {
  const validated = resolveMistakeSchema.safeParse(input);
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
      // Use compound where to verify ownership - prevents resolving another user's mistake
      await prisma.mistakeLog.update({
        where: { id: validated.data.mistakeId, userId: userId! },
        data: { resolved: true },
      });
      return { success: true, data: { resolved: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  return { success: true, data: { resolved: true } };
}

export async function createMistakeLog(
  input: z.infer<typeof createMistakeLogSchema>
): Promise<ActionResult<MistakeLogResult>> {
  const validated = createMistakeLogSchema.safeParse(input);
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

  const mistakeId = crypto.randomUUID();
  const now = new Date().toISOString();

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const log = await prisma.mistakeLog.create({
        data: {
          id: mistakeId,
          attemptId: validated.data.attemptId,
          userId: userId!,
          topicId: validated.data.topicId,
          conceptId: validated.data.conceptId ?? null,
          errorClassification: validated.data.errorClassification,
          confidence: validated.data.confidence,
          resolved: false,
          repeatCount: 0,
          persistentWeakness: false,
        },
      });
      return {
        success: true,
        data: {
          id: log.id,
          attemptId: log.attemptId,
          topicId: log.topicId,
          errorClassification: log.errorClassification,
          confidence: log.confidence,
          resolved: log.resolved,
          repeatCount: log.repeatCount,
          createdAt: log.createdAt.toISOString(),
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
      id: mistakeId,
      attemptId: validated.data.attemptId,
      topicId: validated.data.topicId,
      errorClassification: validated.data.errorClassification,
      confidence: validated.data.confidence,
      resolved: false,
      repeatCount: 0,
      createdAt: now,
    },
  };
}
