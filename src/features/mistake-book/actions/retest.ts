'use server';

import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

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

interface GenerateRetestInput {
  questionIds: string[];
  subject?: string;
  topic?: string;
  errorType?: string;
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function generateRetest(
  input: GenerateRetestInput
): Promise<ActionResult<RetestSessionResult>> {
  if (!input.questionIds || input.questionIds.length === 0) {
    return { success: false, error: 'No questions available for retest.' };
  }

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
    questionIds: input.questionIds,
    config: {
      questionCount: input.questionIds.length,
      timeLimit: null,
      subject: input.subject,
      topic: input.topic,
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
            questionCount: input.questionIds.length,
            timeLimit: null,
            subject: input.subject ?? null,
            topic: input.topic ?? null,
            questionIds: input.questionIds,
          },
          status: 'Active',
          totalQuestions: input.questionIds.length,
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
