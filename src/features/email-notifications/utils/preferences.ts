/**
 * Email preference storage using localStorage.
 */

import type { EmailPreferences } from '../types';

const STORAGE_KEY = 'cfa-buddy-email-prefs';

function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getDefaultPreferences(): EmailPreferences {
  return {
    email: '',
    weeklyReportEnabled: false,
    streakReminderEnabled: false,
    unsubscribeToken: generateToken(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Read email preferences from localStorage.
 */
export function getEmailPreferences(): EmailPreferences {
  if (typeof window === 'undefined') return getDefaultPreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPreferences();
    return JSON.parse(raw) as EmailPreferences;
  } catch {
    return getDefaultPreferences();
  }
}

/**
 * Save email preferences to localStorage.
 */
export function saveEmailPreferences(prefs: EmailPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...prefs,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Update specific preference fields.
 */
export function updateEmailPreferences(updates: Partial<Omit<EmailPreferences, 'unsubscribeToken' | 'updatedAt'>>): EmailPreferences {
  const current = getEmailPreferences();
  const updated: EmailPreferences = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveEmailPreferences(updated);
  return updated;
}

/**
 * Mark the user as unsubscribed (disable all email notifications).
 */
export function unsubscribeAll(): EmailPreferences {
  const current = getEmailPreferences();
  const updated: EmailPreferences = {
    ...current,
    weeklyReportEnabled: false,
    streakReminderEnabled: false,
    updatedAt: new Date().toISOString(),
  };
  saveEmailPreferences(updated);
  return updated;
}

/**
 * Validate an unsubscribe token against stored preferences.
 */
export function validateUnsubscribeToken(token: string): boolean {
  const prefs = getEmailPreferences();
  return prefs.unsubscribeToken === token;
}
