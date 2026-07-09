import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/features/auth/components/profile-form';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  
  if (!supabase) {
    // No Supabase configured — show a basic profile page
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-zinc-400">Supabase not configured. Profile management requires authentication.</p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>
      <ProfileForm
        defaultDisplayName={user.user_metadata?.display_name || ''}
        defaultLevel={user.user_metadata?.level || 'I'}
        email={user.email || ''}
      />
    </div>
  );
}
