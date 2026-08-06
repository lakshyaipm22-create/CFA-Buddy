'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const savePageBookmarkSchema = z.object({
  resourceId: z.string().min(1),
  pageNumber: z.number().int().min(1),
});

const getPageBookmarkSchema = z.object({
  resourceId: z.string().min(1),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageBookmarkResult {
  resourceId: string;
  pageNumber: number;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Save the last-viewed page number for a resource.
 * Uses Supabase DB when available, otherwise returns success for
 * client-side localStorage fallback handling.
 */
export async function savePageBookmark(
  input: z.infer<typeof savePageBookmarkSchema>
): Promise<ActionResult<PageBookmarkResult>> {
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

  if (isDatabaseAvailable() && userId) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      await prisma.pageBookmark.upsert({
        where: {
          userId_resourceId: {
            userId,
            resourceId: validated.data.resourceId,
          },
        },
        update: {
          pageNumber: validated.data.pageNumber,
          updatedAt: new Date(),
        },
        create: {
          userId,
          resourceId: validated.data.resourceId,
          pageNumber: validated.data.pageNumber,
        },
      });
    } catch {
      // Fall through to success - client will use localStorage
    }
  }

  // Always return success - client handles localStorage fallback
  return {
    success: true,
    data: {
      resourceId: validated.data.resourceId,
      pageNumber: validated.data.pageNumber,
    },
  };
}

/**
 * Get the last-viewed page number for a resource.
 * Returns null page if no bookmark exists.
 */
export async function getPageBookmark(
  input: z.infer<typeof getPageBookmarkSchema>
): Promise<ActionResult<PageBookmarkResult | null>> {
  const validated = getPageBookmarkSchema.safeParse(input);
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

  if (isDatabaseAvailable() && userId) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const bookmark = await prisma.pageBookmark.findUnique({
        where: {
          userId_resourceId: {
            userId,
            resourceId: validated.data.resourceId,
          },
        },
      });
      if (bookmark) {
        return {
          success: true,
          data: {
            resourceId: bookmark.resourceId,
            pageNumber: bookmark.pageNumber,
          },
        };
      }
    } catch {
      // Fall through to null
    }
  }

  // No DB bookmark found - client will check localStorage
  return { success: true, data: null };
}
