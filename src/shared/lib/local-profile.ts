/**
 * localStorage-based profile system for CFA Buddy.
 * Works without Supabase authentication.
 */

const STORAGE_KEY = 'cfa-buddy-local-profile';

export interface LocalProfile {
  displayName: string;
  level: 'I' | 'II' | 'III';
  examDate: string; // ISO date string (YYYY-MM-DD) or empty
  studyHoursPerDay: number;
  targetScore: number;
}

const DEFAULT_PROFILE: LocalProfile = {
  displayName: 'CFA Student',
  level: 'I',
  examDate: '',
  studyHoursPerDay: 3,
  targetScore: 70,
};

/**
 * Retrieve the local profile from localStorage.
 * Returns default values if nothing is stored or parsing fails.
 */
export function getLocalProfile(): LocalProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return {
      displayName: parsed.displayName || DEFAULT_PROFILE.displayName,
      level: parsed.level || DEFAULT_PROFILE.level,
      examDate: parsed.examDate || DEFAULT_PROFILE.examDate,
      studyHoursPerDay: parsed.studyHoursPerDay ?? DEFAULT_PROFILE.studyHoursPerDay,
      targetScore: parsed.targetScore ?? DEFAULT_PROFILE.targetScore,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/**
 * Save a profile to localStorage.
 */
export function saveLocalProfile(profile: LocalProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
