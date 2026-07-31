import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { ProfileForm } from '@/features/auth/components/profile-form';
import { LocalProfileForm } from '@/shared/components/profile/local-profile-form';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  
  if (!supabase) {
    // No Supabase configured — use local profile system
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Profile Settings</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Manage your study preferences and exam details. Data is saved locally on this device.
          </p>
        </div>
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          <LocalProfileForm />
        </div>
      </div>
    );
  }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth failed — show local profile instead
  }

  if (!user) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Profile Settings</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Manage your study preferences and exam details. Sign in for cloud sync.
          </p>
        </div>
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          <LocalProfileForm />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Profile</h1>
      <ProfileForm
        defaultDisplayName={user.user_metadata?.display_name || ''}
        defaultLevel={user.user_metadata?.level || 'I'}
        email={user.email || ''}
      />
    </div>
  );
}
