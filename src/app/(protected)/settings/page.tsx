import Link from 'next/link';
import { Database, User } from 'lucide-react';

const settingsSections = [
  {
    title: 'Profile',
    description: 'Manage your study preferences, exam details, and email notifications.',
    href: '/profile',
    icon: User,
  },
  {
    title: 'Data Management',
    description: 'Export your progress as a backup or import data from another device.',
    href: '/settings/data',
    icon: Database,
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Manage your account, preferences, and data.
        </p>
      </div>

      <div className="space-y-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 rounded-xl border p-5 transition-colors"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: 'rgba(197, 162, 88, 0.1)' }}
              >
                <Icon className="h-5 w-5" style={{ color: '#C5A258' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {section.title}
                </p>
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  {section.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
