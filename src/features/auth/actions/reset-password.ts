'use server';

import { resetPasswordSchema, type AuthActionResult } from '../types';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';

export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email') as string,
  };

  const validated = resetPasswordSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      error: 'Please enter a valid email address.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Authentication is not configured.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
  });

  if (error) {
    // Don't reveal whether the email exists
    return { success: true };
  }

  return { success: true };
}
