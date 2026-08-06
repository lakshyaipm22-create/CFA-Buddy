'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['application/pdf'];

// ─── Schema ──────────────────────────────────────────────────────────────────

const uploadMetadataSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
  contentType: z.string().refine((ct) => ALLOWED_TYPES.includes(ct), {
    message: 'Only PDF files are allowed.',
  }),
  subject: z.string().optional(),
  provider: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface UploadResult {
  id: string;
  path: string;
  fileName: string;
}

interface UploadAvailability {
  available: boolean;
  reason?: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Check if file upload is available (requires Supabase Storage).
 */
export async function checkUploadAvailability(): Promise<ActionResult<UploadAvailability>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      success: true,
      data: {
        available: false,
        reason: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable file uploads.',
      },
    };
  }

  return {
    success: true,
    data: { available: true },
  };
}

/**
 * Upload a PDF file to Supabase Storage.
 * Validates file type (PDF only) and size (100MB max).
 * Returns an error if Supabase is not configured.
 */
export async function uploadResource(
  formData: FormData
): Promise<ActionResult<UploadResult>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      success: false,
      error: 'File upload is not available. Supabase Storage is not configured.',
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'No file provided.' };
  }

  // Validate metadata
  const metaValidation = uploadMetadataSchema.safeParse({
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    subject: formData.get('subject') as string | undefined,
    provider: formData.get('provider') as string | undefined,
  });

  if (!metaValidation.success) {
    const errors = metaValidation.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] ?? 'Invalid file.';
    return { success: false, error: firstError };
  }

  // Generate unique path
  const fileId = crypto.randomUUID();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `resources/${user.id}/${fileId}/${sanitizedName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  return {
    success: true,
    data: {
      id: fileId,
      path: storagePath,
      fileName: file.name,
    },
  };
}
