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
    return { success: false, error: 'Authentication is not configured.' };
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

  return { success: true };
}
