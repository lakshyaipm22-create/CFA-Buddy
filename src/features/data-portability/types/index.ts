export interface ExportMetadata {
  exportDate: string;
  appVersion: string;
  dataVersion: number;
}

export interface ExportData {
  metadata: ExportMetadata;
  notes: unknown;
  attempts: unknown;
  sessions: unknown;
  flashcards: unknown;
  progress: unknown;
  mistakes: unknown;
  bookmarks: unknown;
  examTarget: unknown;
  streak: unknown;
  gamification: unknown;
  mockExams: unknown;
  emailPrefs: unknown;
  groups: unknown;
  activityFeed: unknown;
  leaderboard: unknown;
  reviewSessions: unknown;
  reviewHistory: unknown;
  dailyStats: unknown;
  scheduledCards: unknown;
  localProfile: unknown;
}

export interface ImportPreview {
  itemCounts: Record<string, number>;
  exportDate: string;
  appVersion: string;
  dataVersion: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  itemsImported: number;
  errors: ValidationError[];
  warnings: string[];
}
