'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createFlashcardSchema = z.object({
  front: z.string().min(1, 'Front text is required').max(2000),
  back: z.string().min(1, 'Back text is required').max(5000),
  conceptId: z.string().min(1),
  subject: z.string().min(1).optional(),
  topic: z.string().optional(),
});

const reviewFlashcardSchema = z.object({
  flashcardId: z.string().min(1),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  newEaseFactor: z.number().min(1.3).max(5.0),
  newInterval: z.number().int().min(0),
  nextReview: z.string().min(1), // ISO date string
});

const deleteFlashcardSchema = z.object({
  flashcardId: z.string().min(1),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlashcardResult {
  id: string;
  front: string;
  back: string;
  conceptId: string;
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createFlashcard(
  input: z.infer<typeof createFlashcardSchema>
): Promise<ActionResult<FlashcardResult>> {
  const validated = createFlashcardSchema.safeParse(input);
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

  const cardId = crypto.randomUUID();
  const now = new Date().toISOString();

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const card = await prisma.flashcard.create({
        data: {
          id: cardId,
          conceptId: validated.data.conceptId,
          userId: userId!,
          front: validated.data.front,
          back: validated.data.back,
          nextReview: new Date(now),
          intervalDays: 1,
          easeFactor: 2.5,
        },
      });
      return {
        success: true,
        data: {
          id: card.id,
          front: card.front,
          back: card.back,
          conceptId: card.conceptId,
          nextReview: card.nextReview.toISOString(),
          intervalDays: card.intervalDays,
          easeFactor: Number(card.easeFactor),
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
      id: cardId,
      front: validated.data.front,
      back: validated.data.back,
      conceptId: validated.data.conceptId,
      nextReview: now,
      intervalDays: 1,
      easeFactor: 2.5,
    },
  };
}

export async function reviewFlashcard(
  input: z.infer<typeof reviewFlashcardSchema>
): Promise<ActionResult<FlashcardResult>> {
  const validated = reviewFlashcardSchema.safeParse(input);
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
      // Use compound where to verify ownership - prevents updating another user's card
      const card = await prisma.flashcard.update({
        where: { id: validated.data.flashcardId, userId: userId! },
        data: {
          easeFactor: validated.data.newEaseFactor,
          intervalDays: validated.data.newInterval,
          nextReview: new Date(validated.data.nextReview),
        },
      });
      return {
        success: true,
        data: {
          id: card.id,
          front: card.front,
          back: card.back,
          conceptId: card.conceptId,
          nextReview: card.nextReview.toISOString(),
          intervalDays: card.intervalDays,
          easeFactor: Number(card.easeFactor),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback: return result for client-side update
  return {
    success: true,
    data: {
      id: validated.data.flashcardId,
      front: '',
      back: '',
      conceptId: '',
      nextReview: validated.data.nextReview,
      intervalDays: validated.data.newInterval,
      easeFactor: validated.data.newEaseFactor,
    },
  };
}

export async function deleteFlashcard(
  input: z.infer<typeof deleteFlashcardSchema>
): Promise<ActionResult<{ deleted: boolean }>> {
  const validated = deleteFlashcardSchema.safeParse(input);
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
      // Use compound where to verify ownership - prevents deleting another user's card
      await prisma.flashcard.delete({
        where: { id: validated.data.flashcardId, userId: userId! },
      });
      return { success: true, data: { deleted: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  return { success: true, data: { deleted: true } };
}
