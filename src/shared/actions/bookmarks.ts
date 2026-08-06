'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const toggleQuestionBookmarkSchema = z.object({
  questionId: z.string().min(1),
  bookmarked: z.boolean(),
});

const toggleResourceBookmarkSchema = z.object({
  resourceId: z.string().min(1),
  bookmarked: z.boolean(),
});

const toggleNoteBookmarkSchema = z.object({
  noteId: z.string().min(1),
  bookmarked: z.boolean(),
});

const savePageBookmarkSchema = z.object({
  resourceId: z.string().min(1),
  pageNumber: z.number().int().min(1),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function toggleQuestionBookmark(
  input: z.infer<typeof toggleQuestionBookmarkSchema>
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const validated = toggleQuestionBookmarkSchema.safeParse(input);
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

export async function toggleResourceBookmark(
  input: z.infer<typeof toggleResourceBookmarkSchema>
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const validated = toggleResourceBookmarkSchema.safeParse(input);
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
        await prisma.resourceBookmark.upsert({
          where: {
            userId_resourceId: {
              userId: userId!,
              resourceId: validated.data.resourceId,
            },
          },
          update: {},
          create: {
            userId: userId!,
            resourceId: validated.data.resourceId,
          },
        });
      } else {
        await prisma.resourceBookmark.deleteMany({
          where: {
            userId: userId!,
            resourceId: validated.data.resourceId,
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

export async function toggleNoteBookmark(
  input: z.infer<typeof toggleNoteBookmarkSchema>
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const validated = toggleNoteBookmarkSchema.safeParse(input);
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
        await prisma.noteBookmark.upsert({
          where: {
            userId_noteId: {
              userId: userId!,
              noteId: validated.data.noteId,
            },
          },
          update: {},
          create: {
            userId: userId!,
            noteId: validated.data.noteId,
          },
        });
      } else {
        await prisma.noteBookmark.deleteMany({
          where: {
            userId: userId!,
            noteId: validated.data.noteId,
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

export async function savePageBookmark(
  input: z.infer<typeof savePageBookmarkSchema>
): Promise<ActionResult<{ resourceId: string; pageNumber: number }>> {
  const validated = savePageBookmarkSchema.safeParse(input);
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
      await prisma.pageBookmark.upsert({
        where: {
          userId_resourceId: {
            userId: userId!,
            resourceId: validated.data.resourceId,
          },
        },
        update: {
          pageNumber: validated.data.pageNumber,
        },
        create: {
          userId: userId!,
          resourceId: validated.data.resourceId,
          pageNumber: validated.data.pageNumber,
        },
      });
      return {
        success: true,
        data: {
          resourceId: validated.data.resourceId,
          pageNumber: validated.data.pageNumber,
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
      resourceId: validated.data.resourceId,
      pageNumber: validated.data.pageNumber,
    },
  };
}
