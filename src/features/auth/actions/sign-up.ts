'use server';

import { redirect } from 'next/navigation';
import { signUpSchema, type AuthActionResult } from '../types';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    displayName: formData.get('displayName') as string,
    level: formData.get('level') as string,
  };

  const validated = signUpSchema.safeParse(rawData);
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

  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        display_name: validated.data.displayName,
        level: validated.data.level,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'This email is already registered.' };
    }
    return { success: false, error: 'Sign up failed. Please try again.' };
  }

  redirect('/dashboard');
}
