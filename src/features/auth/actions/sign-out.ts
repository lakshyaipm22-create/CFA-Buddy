'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}
