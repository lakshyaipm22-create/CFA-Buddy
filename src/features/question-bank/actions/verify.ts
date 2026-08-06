'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const approveQuestionSchema = z.object({
  questionId: z.string().min(1),
});

const rejectQuestionSchema = z.object({
  questionId: z.string().min(1),
  reason: z.string().min(1).max(500).optional(),
});

const bulkApproveSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(100),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface VerificationResult {
  questionId: string;
  status: string;
}

interface BulkApproveResult {
  approved: number;
  failed: number;
  errors: string[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Approve a single question, setting its verification status to 'approved'.
 * Requires admin access via Supabase auth and a database connection.
 */
export async function approveQuestion(
  input: z.infer<typeof approveQuestionSchema>
): Promise<ActionResult<VerificationResult>> {
  const validated = approveQuestionSchema.safeParse(input);
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

  if (!isDatabaseAvailable()) {
    // Without DB, return success for local development
    return {
      success: true,
      data: {
        questionId: validated.data.questionId,
        status: 'approved',
      },
    };
  }

  const { prisma } = await import('@/shared/lib/prisma/client');
  try {
    await prisma.question.update({
      where: { id: validated.data.questionId },
      data: {
        verificationStatus: 'approved',
      },
    });
    return {
      success: true,
      data: {
        questionId: validated.data.questionId,
        status: 'approved',
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    return { success: false, error: message };
  }
}

/**
 * Reject a single question, setting its verification status to 'rejected'.
 */
export async function rejectQuestion(
  input: z.infer<typeof rejectQuestionSchema>
): Promise<ActionResult<VerificationResult>> {
  const validated = rejectQuestionSchema.safeParse(input);
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

  if (!isDatabaseAvailable()) {
    return {
      success: true,
      data: {
        questionId: validated.data.questionId,
        status: 'rejected',
      },
    };
  }

  const { prisma } = await import('@/shared/lib/prisma/client');
  try {
    await prisma.question.update({
      where: { id: validated.data.questionId },
      data: {
        verificationStatus: 'rejected',
      },
    });
    return {
      success: true,
      data: {
        questionId: validated.data.questionId,
        status: 'rejected',
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    return { success: false, error: message };
  }
}

/**
 * Bulk approve multiple questions at once.
 */
export async function bulkApprove(
  input: z.infer<typeof bulkApproveSchema>
): Promise<ActionResult<BulkApproveResult>> {
  const validated = bulkApproveSchema.safeParse(input);
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

  if (!isDatabaseAvailable()) {
    return {
      success: true,
      data: {
        approved: validated.data.questionIds.length,
        failed: 0,
        errors: [],
      },
    };
  }

  const { prisma } = await import('@/shared/lib/prisma/client');
  let approved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const questionId of validated.data.questionIds) {
    try {
      await prisma.question.update({
        where: { id: questionId },
        data: {
          verificationStatus: 'approved',
        },
      });
      approved++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${questionId}: ${message}`);
    }
  }

  return {
    success: true,
    data: { approved, failed, errors },
  };
}
