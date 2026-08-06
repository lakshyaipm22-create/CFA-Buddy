'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schema ──────────────────────────────────────────────────────────────────

const generateRetestSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(200),
  subject: z.string().optional(),
  topic: z.string().optional(),
  errorType: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetestSessionResult {
  id: string;
  mode: 'AdaptiveRetest';
  questionIds: string[];
  config: {
    questionCount: number;
    timeLimit: number | null;
    subject?: string;
    topic?: string;
  };
  createdAt: string;
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function generateRetest(
  input: z.infer<typeof generateRetestSchema>
): Promise<ActionResult<RetestSessionResult>> {
  const validated = generateRetestSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: 'Invalid input: question IDs are required (1-200 items).' };
  }

  const { questionIds, subject, topic } = validated.data;

  const supabase = await createServerSupabaseClient();
  const userId = supabase
    ? (await supabase.auth.getUser()).data.user?.id
    : null;

  if (isDatabaseAvailable() && !userId) {
    return { success: false, error: 'Authentication required.' };
  }

  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Build the retest session
  const retestSession: RetestSessionResult = {
    id: sessionId,
    mode: 'AdaptiveRetest',
    questionIds,
    config: {
      questionCount: questionIds.length,
      timeLimit: null,
      subject,
      topic,
    },
    createdAt: now,
  };

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      await prisma.questionSession.create({
        data: {
          id: sessionId,
          userId: userId!,
          mode: 'AdaptiveRetest',
          config: {
            questionCount: questionIds.length,
            timeLimit: null,
            subject: subject ?? null,
            topic: topic ?? null,
            questionIds,
          },
          status: 'Active',
          totalQuestions: questionIds.length,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  return { success: true, data: retestSession };
}
