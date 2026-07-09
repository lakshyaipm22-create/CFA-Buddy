import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { DashboardContent } from '@/features/dashboard/components/dashboard-content';

export default async function DashboardPage() {
  let displayName = 'CFA Student';
  let level = 'I';

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        displayName = user.user_metadata?.display_name || 'CFA Student';
        level = user.user_metadata?.level || 'I';
      }
    } catch {
      // Auth failed — use defaults
    }
  }

  return <DashboardContent displayName={displayName} level={level} />;
}
