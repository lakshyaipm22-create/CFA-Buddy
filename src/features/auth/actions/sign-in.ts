'use server';

import { redirect } from 'next/navigation';
import { signInSchema, type AuthActionResult } from '../types';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const validated = signInSchema.safeParse(rawData);
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

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { success: false, error: 'Invalid email or password.' };
  }

  redirect('/dashboard');
}
