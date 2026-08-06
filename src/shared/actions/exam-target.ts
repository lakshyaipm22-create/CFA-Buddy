'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const setExamTargetSchema = z.object({
  targetDate: z.string().min(1, 'Target date is required'),
  targetLevel: z.enum(['I', 'II', 'III']),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExamTargetResult {
  id: string;
  targetDate: string;
  targetLevel: string;
  createdAt: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function setExamTarget(
  input: z.infer<typeof setExamTargetSchema>
): Promise<ActionResult<ExamTargetResult>> {
  const validated = setExamTargetSchema.safeParse(input);
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

  const now = new Date().toISOString();

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const target = await prisma.examTarget.upsert({
        where: { userId: userId! },
        update: {
          targetDate: new Date(validated.data.targetDate),
          targetLevel: validated.data.targetLevel,
        },
        create: {
          userId: userId!,
          targetDate: new Date(validated.data.targetDate),
          targetLevel: validated.data.targetLevel,
        },
      });
      return {
        success: true,
        data: {
          id: target.id,
          targetDate: target.targetDate.toISOString(),
          targetLevel: target.targetLevel,
          createdAt: target.createdAt.toISOString(),
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
      id: crypto.randomUUID(),
      targetDate: validated.data.targetDate,
      targetLevel: validated.data.targetLevel,
      createdAt: now,
    },
  };
}

export async function getExamTarget(): Promise<ActionResult<ExamTargetResult | null>> {
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
      const target = await prisma.examTarget.findUnique({
        where: { userId: userId! },
      });
      if (!target) {
        return { success: true, data: null };
      }
      return {
        success: true,
        data: {
          id: target.id,
          targetDate: target.targetDate.toISOString(),
          targetLevel: target.targetLevel,
          createdAt: target.createdAt.toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // No DB: return null (client reads from localStorage directly)
  return { success: true, data: null };
}
