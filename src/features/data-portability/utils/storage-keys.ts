/**
 * Maps export data fields to their localStorage keys.
 * This is the single source of truth for all exportable/importable data.
 */
export const STORAGE_KEY_MAP: Record<string, string> = {
  notes: 'cfa-buddy-notes',
  attempts: 'cfa-buddy-attempts',
  sessions: 'cfa-buddy-sessions',
  flashcards: 'cfa-buddy-flashcards',
  progress: 'cfa-buddy-progress',
  mistakes: 'cfa-buddy-mistakes',
  bookmarks: 'cfa-buddy-bookmarks',
  examTarget: 'cfa-buddy-exam-target',
  streak: 'cfa-buddy-streak',
  gamification: 'cfa-buddy-gamification',
  mockExams: 'cfa-buddy-mock-exams',
  emailPrefs: 'cfa-buddy-email-prefs',
  groups: 'cfa-buddy-groups',
  activityFeed: 'cfa-buddy-activity-feed',
  leaderboard: 'cfa-buddy-leaderboard',
  reviewSessions: 'cfa-buddy-review-sessions',
  reviewHistory: 'cfa-buddy-review-history',
  dailyStats: 'cfa-buddy-daily-stats',
  scheduledCards: 'cfa-buddy-scheduled-cards',
  localProfile: 'cfa-buddy-local-profile',
};

/** Human-readable labels for each data section */
export const SECTION_LABELS: Record<string, string> = {
  notes: 'Notes',
  attempts: 'Question Attempts',
  sessions: 'Practice Sessions',
  flashcards: 'Flashcards',
  progress: 'Topic Progress',
  mistakes: 'Mistake Logs',
  bookmarks: 'Bookmarks',
  examTarget: 'Exam Target Date',
  streak: 'Study Streak',
  gamification: 'Gamification (XP, Badges)',
  mockExams: 'Mock Exam History',
  emailPrefs: 'Email Preferences',
  groups: 'Study Groups',
  activityFeed: 'Activity Feed',
  leaderboard: 'Leaderboard Cache',
  reviewSessions: 'Spaced Repetition Sessions',
  reviewHistory: 'Spaced Repetition History',
  dailyStats: 'Daily Review Stats',
  scheduledCards: 'Scheduled Flashcards',
  localProfile: 'User Profile',
};
