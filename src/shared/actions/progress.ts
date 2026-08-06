'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updateProgressSchema = z.object({
  topicId: z.string().min(1),
  questionsAttempted: z.number().int().min(0),
  questionsCorrect: z.number().int().min(0),
  masteryLevel: z.number().int().min(0).max(100),
});

const updateStreakSchema = z.object({
  studyDate: z.string().min(1), // ISO date string (YYYY-MM-DD)
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProgressResult {
  topicId: string;
  masteryLevel: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastStudied: string;
}

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function updateProgress(
  input: z.infer<typeof updateProgressSchema>
): Promise<ActionResult<ProgressResult>> {
  const validated = updateProgressSchema.safeParse(input);
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
      const progress = await prisma.progress.upsert({
        where: {
          userId_topicId: {
            userId: userId!,
            topicId: validated.data.topicId,
          },
        },
        update: {
          masteryLevel: validated.data.masteryLevel,
          questionsAttempted: validated.data.questionsAttempted,
          questionsCorrect: validated.data.questionsCorrect,
          lastStudied: new Date(now),
        },
        create: {
          userId: userId!,
          topicId: validated.data.topicId,
          masteryLevel: validated.data.masteryLevel,
          questionsAttempted: validated.data.questionsAttempted,
          questionsCorrect: validated.data.questionsCorrect,
          lastStudied: new Date(now),
        },
      });
      return {
        success: true,
        data: {
          topicId: progress.topicId,
          masteryLevel: progress.masteryLevel,
          questionsAttempted: progress.questionsAttempted,
          questionsCorrect: progress.questionsCorrect,
          lastStudied: progress.lastStudied?.toISOString() ?? now,
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
      topicId: validated.data.topicId,
      masteryLevel: validated.data.masteryLevel,
      questionsAttempted: validated.data.questionsAttempted,
      questionsCorrect: validated.data.questionsCorrect,
      lastStudied: now,
    },
  };
}

export async function updateStreak(
  input: z.infer<typeof updateStreakSchema>
): Promise<ActionResult<StreakResult>> {
  const validated = updateStreakSchema.safeParse(input);
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

  const studyDate = validated.data.studyDate;

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const existing = await prisma.studyStreak.findUnique({
        where: { userId: userId! },
      });

      let currentStreak = 1;
      let longestStreak = 1;

      if (existing) {
        const lastDate = existing.lastStudyDate
          ? existing.lastStudyDate.toISOString().slice(0, 10)
          : null;
        const yesterday = new Date(
          new Date(studyDate).getTime() - 86400000
        ).toISOString().slice(0, 10);

        if (lastDate === studyDate) {
          // Already studied today
          currentStreak = existing.currentStreak;
        } else if (lastDate === yesterday) {
          // Consecutive day
          currentStreak = existing.currentStreak + 1;
        }
        // Otherwise streak resets to 1

        longestStreak = Math.max(existing.longestStreak, currentStreak);
      }

      const streak = await prisma.studyStreak.upsert({
        where: { userId: userId! },
        update: {
          currentStreak,
          longestStreak,
          lastStudyDate: new Date(studyDate),
          streakStartDate: currentStreak === 1 ? new Date(studyDate) : undefined,
        },
        create: {
          userId: userId!,
          currentStreak,
          longestStreak,
          lastStudyDate: new Date(studyDate),
          streakStartDate: new Date(studyDate),
        },
      });

      return {
        success: true,
        data: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStudyDate: streak.lastStudyDate?.toISOString() ?? studyDate,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback: return basic streak for client-side handling
  return {
    success: true,
    data: {
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: studyDate,
    },
  };
}
