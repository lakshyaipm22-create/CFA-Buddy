'use server';

import { updateProfileSchema, type AuthActionResult } from '../types';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';

export async function updateProfile(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    displayName: formData.get('displayName') as string,
    level: formData.get('level') as string,
  };

  const validated = updateProfileSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    // When Supabase is not configured, return success.
    // The client-side LocalProfileForm handles localStorage persistence directly.
    return { success: true };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      display_name: validated.data.displayName,
      level: validated.data.level,
    },
  });

  if (error) {
    return { success: false, error: 'Failed to update profile. Please try again.' };
  }

  // Also update the database User record if it exists
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { prisma } = await import('@/shared/lib/prisma/client');
      await prisma.user.update({
        where: { authUserId: user.id },
        data: {
          displayName: validated.data.displayName,
          level: validated.data.level as 'I' | 'II' | 'III',
        },
      });
    }
  } catch {
    // DB update is best-effort - Supabase auth metadata is the primary source
  }

  return { success: true };
}
