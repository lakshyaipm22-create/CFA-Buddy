import { LocalProfileForm } from '@/shared/components/profile/local-profile-form';
import { EmailPreferencesForm } from '@/features/email-notifications/components/email-preferences';

/**
 * Profile page — publicly accessible, no auth required.
 * All profile data is stored in localStorage via LocalProfile.
 */
export default function ProfilePage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Profile Settings
        </h1>
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
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      >
        <EmailPreferencesForm />
      </div>
    </div>
  );
}
