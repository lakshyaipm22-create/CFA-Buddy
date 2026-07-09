import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { DashboardContent } from '@/features/dashboard/components/dashboard-content';

export default async function DashboardPage() {
  // Try to get user info, but don't block if Supabase isn't configured
  let displayName = 'CFA Student';
  let level = 'I';
  
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      displayName = user.user_metadata?.display_name || 'CFA Student';
      level = user.user_metadata?.level || 'I';
    }
  } catch {
    // Supabase not configured — use defaults
  }

  return <DashboardContent displayName={displayName} level={level} />;
}
