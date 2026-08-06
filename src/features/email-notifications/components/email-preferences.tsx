'use client';

/**
 * Email preferences UI component.
 * Allows users to manage their email notification settings.
 */

import { useState } from 'react';
import { Mail, Bell, BellOff, Check } from 'lucide-react';
import { getEmailPreferences, updateEmailPreferences } from '../utils/preferences';
import type { EmailPreferences } from '../types';

export function EmailPreferencesForm() {
  const [prefs, setPrefs] = useState<EmailPreferences>(() => getEmailPreferences());
  const [email, setEmail] = useState(() => prefs.email);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const updated = updateEmailPreferences({
      email,
      weeklyReportEnabled: prefs.weeklyReportEnabled,
      streakReminderEnabled: prefs.streakReminderEnabled,
    });
    setPrefs(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleWeeklyReport() {
    const updated = updateEmailPreferences({
      weeklyReportEnabled: !prefs.weeklyReportEnabled,
    });
    setPrefs(updated);
  }

  function toggleStreakReminder() {
    const updated = updateEmailPreferences({
      streakReminderEnabled: !prefs.streakReminderEnabled,
    });
    setPrefs(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5" style={{ color: '#C5A258' }} />
        <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Email Notifications
        </h3>
      </div>

      {/* Email address input */}
      <div className="space-y-2">
        <label
          htmlFor="email-address"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          Email Address
        </label>
        <input
          id="email-address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{
            background: 'var(--input-bg, #1a1f2e)',
            borderColor: 'var(--card-border, #2a3040)',
            color: 'var(--foreground)',
          }}
        />
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          We will send notifications to this address when enabled.
        </p>
      </div>

      {/* Notification toggles */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={toggleWeeklyReport}
          className="flex w-full items-center justify-between rounded-lg border p-4 transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--card-border, #2a3040)' }}
        >
          <div className="flex items-center gap-3">
            {prefs.weeklyReportEnabled ? (
              <Bell className="h-4 w-4" style={{ color: '#00843D' }} />
            ) : (
              <BellOff className="h-4 w-4" style={{ color: '#6b7280' }} />
            )}
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Weekly Progress Report
              </div>
              <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Receive a summary of your weekly study stats every Sunday
              </div>
            </div>
          </div>
          <div
            className="h-5 w-9 rounded-full transition-colors"
            style={{
              backgroundColor: prefs.weeklyReportEnabled ? '#00843D' : '#4b5563',
              position: 'relative',
            }}
          >
            <div
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
              style={{
                transform: prefs.weeklyReportEnabled ? 'translateX(16px)' : 'translateX(2px)',
              }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={toggleStreakReminder}
          className="flex w-full items-center justify-between rounded-lg border p-4 transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--card-border, #2a3040)' }}
        >
          <div className="flex items-center gap-3">
            {prefs.streakReminderEnabled ? (
              <Bell className="h-4 w-4" style={{ color: '#00843D' }} />
            ) : (
              <BellOff className="h-4 w-4" style={{ color: '#6b7280' }} />
            )}
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Streak Reminders
              </div>
              <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Get notified when your study streak is at risk of breaking
              </div>
            </div>
          </div>
          <div
            className="h-5 w-9 rounded-full transition-colors"
            style={{
              backgroundColor: prefs.streakReminderEnabled ? '#00843D' : '#4b5563',
              position: 'relative',
            }}
          >
            <div
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
              style={{
                transform: prefs.streakReminderEnabled ? 'translateX(16px)' : 'translateX(2px)',
              }}
            />
          </div>
        </button>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!email}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#C5A258' }}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          'Save Preferences'
        )}
      </button>
    </div>
  );
}
