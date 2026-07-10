import { SettingsContent } from '@/features/settings/components/settings-content';

export const metadata = {
  title: 'Settings — CFA Buddy',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Manage your preferences, data, and account.
        </p>
      </div>
      <SettingsContent />
    </div>
  );
}
