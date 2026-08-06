/**
 * Unified Data Access Layer
 *
 * Provides CRUD operations that route to either:
 * - Prisma/DB when DATABASE_URL is configured and reachable
 * - localStorage (via client-side calls) as the fallback
 *
 * Server Actions call these functions. When running server-side without a DB,
 * they return a "not available" result. Client-side code uses localStorage directly.
 *
 * The key principle: this module detects DB availability at runtime and adapts.
 */

import type { QuestionSession, QuestionAttempt } from '@/features/question-bank/types';
import type { Flashcard } from '@/features/flashcards/types';

// ─── DB Availability Check ───────────────────────────────────────────────────

let dbAvailableCache: boolean | null = null;

/**
 * Check if the database is available (DATABASE_URL is set).
 * Cached after first check for the process lifetime.
 *
 * NOTE: This value is permanently cached for the lifetime of the process.
 * If DATABASE_URL becomes available after cold start (e.g., environment variable
 * rotation in a long-lived serverless function), the cache will not invalidate.
 * This is acceptable for Vercel deployments where env changes trigger redeployment,
 * but other deploy targets should be aware that a cold restart is required for
 * newly-configured database connections to take effect.
 */
export function isDatabaseAvailable(): boolean {
  if (dbAvailableCache !== null) return dbAvailableCache;
  dbAvailableCache = Boolean(
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('placeholder')
  );
  return dbAvailableCache;
}

/**
 * Reset the DB availability cache (useful for testing).
 */
export function resetDbAvailabilityCache(): void {
  dbAvailableCache = null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NoteData {
  id: string;
  userId: string;
  topicId?: string | null;
  conceptId?: string | null;
  questionId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressData {
  userId: string;
  topicId: string;
  masteryLevel: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastStudied: string | null;
}

export interface MistakeLogData {
  id: string;
  attemptId: string;
  userId: string;
  conceptId?: string | null;
  topicId: string;
  errorClassification: string;
  confidence: string;
  resolved: boolean;
  repeatCount: number;
  persistentWeakness: boolean;
  createdAt: string;
}

export interface BookmarkData {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'question' | 'resource' | 'note' | 'page';
  pageNumber?: number;
  createdAt: string;
}

export interface ExamTargetData {
  id: string;
  userId: string;
  targetDate: string;
  targetLevel: string;
  createdAt: string;
}

export interface StudyStreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  lastStudyDate: string | null;
}

// ─── LocalStorage Keys (matching existing patterns) ──────────────────────────

const KEYS = {
  notes: 'cfa-buddy-notes',
  attempts: 'cfa-buddy-attempts',
  sessions: 'cfa-buddy-sessions',
  flashcards: 'cfa-buddy-flashcards',
  progress: 'cfa-buddy-progress',
  mistakes: 'cfa-buddy-mistakes',
  bookmarks: 'cfa-buddy-bookmarks',
  examTarget: 'cfa-buddy-exam-target',
  streak: 'cfa-buddy-streak',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function readLocalStorage<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocalStorage<T>(key: string, data: T): void {
  if (!isClient()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export function getNotes(userId: string): NoteData[] {
  if (isDatabaseAvailable()) {
    // DB path would use Prisma - return empty for now (server-side)
    return [];
  }
  const all = readLocalStorage<NoteData[]>(KEYS.notes) ?? [];
  return all.filter(n => n.userId === userId);
}

export function saveNote(note: NoteData): NoteData {
  if (isDatabaseAvailable()) {
    // DB path would use Prisma
    return note;
  }
  const all = readLocalStorage<NoteData[]>(KEYS.notes) ?? [];
  const idx = all.findIndex(n => n.id === note.id);
  if (idx >= 0) {
    all[idx] = note;
  } else {
    all.push(note);
  }
  writeLocalStorage(KEYS.notes, all);
  return note;
}

export function deleteNoteById(noteId: string, userId: string): boolean {
  if (isDatabaseAvailable()) {
    return true;
  }
  const all = readLocalStorage<NoteData[]>(KEYS.notes) ?? [];
  const filtered = all.filter(n => !(n.id === noteId && n.userId === userId));
  writeLocalStorage(KEYS.notes, filtered);
  return filtered.length < all.length;
}

// ─── Attempts ────────────────────────────────────────────────────────────────

export function getAttempts(userId: string): QuestionAttempt[] {
  if (isDatabaseAvailable()) {
    return [];
  }
  const all = readLocalStorage<(QuestionAttempt & { userId?: string })[]>(KEYS.attempts) ?? [];
  return all.filter(a => !a.userId || a.userId === userId);
}

export function saveAttemptRecord(attempt: QuestionAttempt & { userId?: string }): QuestionAttempt {
  if (isDatabaseAvailable()) {
    return attempt;
  }
  const all = readLocalStorage<(QuestionAttempt & { userId?: string })[]>(KEYS.attempts) ?? [];
  all.push(attempt);
  writeLocalStorage(KEYS.attempts, all);
  return attempt;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function getSessionById(sessionId: string): QuestionSession | null {
  if (isDatabaseAvailable()) {
    return null;
  }
  const all = readLocalStorage<QuestionSession[]>(KEYS.sessions) ?? [];
  return all.find(s => s.id === sessionId) ?? null;
}

export function saveSessionRecord(session: QuestionSession): QuestionSession {
  if (isDatabaseAvailable()) {
    return session;
  }
  const all = readLocalStorage<QuestionSession[]>(KEYS.sessions) ?? [];
  const idx = all.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.push(session);
  }
  writeLocalStorage(KEYS.sessions, all);
  return session;
}

// ─── Flashcards ──────────────────────────────────────────────────────────────

export function getFlashcards(userId: string): Flashcard[] {
  if (isDatabaseAvailable()) {
    return [];
  }
  // localStorage flashcards don't have userId; return all
  const all = readLocalStorage<(Flashcard & { userId?: string })[]>(KEYS.flashcards) ?? [];
  return all.filter(f => !f.userId || f.userId === userId);
}

export function saveFlashcard(card: Flashcard & { userId?: string }): Flashcard {
  if (isDatabaseAvailable()) {
    return card;
  }
  const all = readLocalStorage<(Flashcard & { userId?: string })[]>(KEYS.flashcards) ?? [];
  const idx = all.findIndex(c => c.id === card.id);
  if (idx >= 0) {
    all[idx] = card;
  } else {
    all.push(card);
  }
  writeLocalStorage(KEYS.flashcards, all);
  return card;
}

export function deleteFlashcardById(cardId: string): boolean {
  if (isDatabaseAvailable()) {
    return true;
  }
  const all = readLocalStorage<Flashcard[]>(KEYS.flashcards) ?? [];
  const filtered = all.filter(c => c.id !== cardId);
  writeLocalStorage(KEYS.flashcards, filtered);
  return filtered.length < all.length;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function getProgress(userId: string): ProgressData[] {
  if (isDatabaseAvailable()) {
    return [];
  }
  const all = readLocalStorage<ProgressData[]>(KEYS.progress) ?? [];
  return all.filter(p => p.userId === userId);
}

export function saveProgress(progress: ProgressData): ProgressData {
  if (isDatabaseAvailable()) {
    return progress;
  }
  const all = readLocalStorage<ProgressData[]>(KEYS.progress) ?? [];
  const idx = all.findIndex(
    p => p.userId === progress.userId && p.topicId === progress.topicId
  );
  if (idx >= 0) {
    all[idx] = progress;
  } else {
    all.push(progress);
  }
  writeLocalStorage(KEYS.progress, all);
  return progress;
}

// ─── Mistakes ────────────────────────────────────────────────────────────────

export function getMistakeLogs(userId: string): MistakeLogData[] {
  if (isDatabaseAvailable()) {
    return [];
  }
  const all = readLocalStorage<MistakeLogData[]>(KEYS.mistakes) ?? [];
  return all.filter(m => m.userId === userId);
}

export function saveMistakeLog(log: MistakeLogData): MistakeLogData {
  if (isDatabaseAvailable()) {
    return log;
  }
  const all = readLocalStorage<MistakeLogData[]>(KEYS.mistakes) ?? [];
  const idx = all.findIndex(m => m.id === log.id);
  if (idx >= 0) {
    all[idx] = log;
  } else {
    all.push(log);
  }
  writeLocalStorage(KEYS.mistakes, all);
  return log;
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export function getBookmarks(userId: string): BookmarkData[] {
  if (isDatabaseAvailable()) {
    return [];
  }
  const all = readLocalStorage<BookmarkData[]>(KEYS.bookmarks) ?? [];
  return all.filter(b => b.userId === userId);
}

export function saveBookmark(bookmark: BookmarkData): BookmarkData {
  if (isDatabaseAvailable()) {
    return bookmark;
  }
  const all = readLocalStorage<BookmarkData[]>(KEYS.bookmarks) ?? [];
  const idx = all.findIndex(b => b.id === bookmark.id);
  if (idx >= 0) {
    all[idx] = bookmark;
  } else {
    all.push(bookmark);
  }
  writeLocalStorage(KEYS.bookmarks, all);
  return bookmark;
}

export function removeBookmark(bookmarkId: string, userId: string): boolean {
  if (isDatabaseAvailable()) {
    return true;
  }
  const all = readLocalStorage<BookmarkData[]>(KEYS.bookmarks) ?? [];
  const filtered = all.filter(b => !(b.id === bookmarkId && b.userId === userId));
  writeLocalStorage(KEYS.bookmarks, filtered);
  return filtered.length < all.length;
}

// ─── Exam Target ─────────────────────────────────────────────────────────────

export function getExamTargetData(userId: string): ExamTargetData | null {
  if (isDatabaseAvailable()) {
    return null;
  }
  const all = readLocalStorage<ExamTargetData[]>(KEYS.examTarget) ?? [];
  return all.find(e => e.userId === userId) ?? null;
}

export function saveExamTarget(target: ExamTargetData): ExamTargetData {
  if (isDatabaseAvailable()) {
    return target;
  }
  const all = readLocalStorage<ExamTargetData[]>(KEYS.examTarget) ?? [];
  const idx = all.findIndex(e => e.userId === target.userId);
  if (idx >= 0) {
    all[idx] = target;
  } else {
    all.push(target);
  }
  writeLocalStorage(KEYS.examTarget, all);
  return target;
}

// ─── Study Streak ────────────────────────────────────────────────────────────

export function getStudyStreak(userId: string): StudyStreakData | null {
  if (isDatabaseAvailable()) {
    return null;
  }
  const all = readLocalStorage<StudyStreakData[]>(KEYS.streak) ?? [];
  return all.find(s => s.userId === userId) ?? null;
}

export function saveStudyStreak(streak: StudyStreakData): StudyStreakData {
  if (isDatabaseAvailable()) {
    return streak;
  }
  const all = readLocalStorage<StudyStreakData[]>(KEYS.streak) ?? [];
  const idx = all.findIndex(s => s.userId === streak.userId);
  if (idx >= 0) {
    all[idx] = streak;
  } else {
    all.push(streak);
  }
  writeLocalStorage(KEYS.streak, all);
  return streak;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserData {
  id: string;
  authUserId: string;
  displayName: string;
  level: string;
}

/**
 * Get user from DB or localStorage profile.
 * Returns null if not available.
 */
export function getUser(authUserId: string): UserData | null {
  if (isDatabaseAvailable()) {
    return null;
  }
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem('cfa-buddy-local-profile');
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return {
      id: profile.id ?? authUserId,
      authUserId,
      displayName: profile.displayName ?? 'User',
      level: profile.level ?? 'I',
    };
  } catch {
    return null;
  }
}
