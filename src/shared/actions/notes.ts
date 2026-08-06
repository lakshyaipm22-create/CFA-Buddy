'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';
import type { NoteData } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createNoteSchema = z.object({
  topicId: z.string().min(1).optional(),
  conceptId: z.string().min(1).optional(),
  questionId: z.string().min(1).optional(),
  content: z.string().min(1, 'Note content is required').max(10000),
});

const updateNoteSchema = z.object({
  noteId: z.string().min(1, 'Note ID is required'),
  content: z.string().min(1, 'Note content is required').max(10000),
});

const deleteNoteSchema = z.object({
  noteId: z.string().min(1, 'Note ID is required'),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createNote(
  input: z.infer<typeof createNoteSchema>
): Promise<ActionResult<NoteData>> {
  const validated = createNoteSchema.safeParse(input);
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
  const note: NoteData = {
    id: crypto.randomUUID(),
    userId: userId ?? 'local',
    topicId: validated.data.topicId ?? null,
    conceptId: validated.data.conceptId ?? null,
    questionId: validated.data.questionId ?? null,
    content: validated.data.content,
    createdAt: now,
    updatedAt: now,
  };

  if (isDatabaseAvailable()) {
    // DB path: use Prisma to create
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const created = await prisma.note.create({
        data: {
          id: note.id,
          userId: note.userId,
          topicId: note.topicId,
          conceptId: note.conceptId,
          questionId: note.questionId,
          content: note.content,
        },
      });
      return {
        success: true,
        data: {
          id: created.id,
          userId: created.userId,
          topicId: created.topicId,
          conceptId: created.conceptId,
          questionId: created.questionId,
          content: created.content,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback: return the note for client-side save
  return { success: true, data: note };
}

export async function updateNote(
  input: z.infer<typeof updateNoteSchema>
): Promise<ActionResult<NoteData>> {
  const validated = updateNoteSchema.safeParse(input);
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
      const updated = await prisma.note.update({
        where: { id: validated.data.noteId },
        data: { content: validated.data.content },
      });
      return {
        success: true,
        data: {
          id: updated.id,
          userId: updated.userId,
          topicId: updated.topicId,
          conceptId: updated.conceptId,
          questionId: updated.questionId,
          content: updated.content,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback
  const now = new Date().toISOString();
  const note: NoteData = {
    id: validated.data.noteId,
    userId: userId ?? 'local',
    topicId: null,
    conceptId: null,
    questionId: null,
    content: validated.data.content,
    createdAt: now,
    updatedAt: now,
  };
  return { success: true, data: note };
}

export async function deleteNote(
  input: z.infer<typeof deleteNoteSchema>
): Promise<ActionResult<{ deleted: boolean }>> {
  const validated = deleteNoteSchema.safeParse(input);
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
      await prisma.note.delete({
        where: { id: validated.data.noteId },
      });
      return { success: true, data: { deleted: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error';
      return { success: false, error: message };
    }
  }

  // localStorage fallback
  return { success: true, data: { deleted: true } };
}
