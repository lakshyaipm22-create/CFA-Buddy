import type { QuestionSession } from '../types';

const SESSIONS_KEY = 'cfa-buddy-sessions';

/**
 * Get all sessions from localStorage
 */
export function getSessions(): QuestionSession[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save a session (create or update)
 */
export function saveSession(session: QuestionSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * Get a specific session by ID
 */
export function getSession(id: string): QuestionSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.id === id) ?? null;
}

/**
 * Find the most recent active (resumable) session
 */
export function getResumableSession(): QuestionSession | null {
  const sessions = getSessions();
  const now = new Date().getTime();
  
  return sessions
    .filter(s => s.status === 'active' && new Date(s.expiresAt).getTime() > now)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null;
}

/**
 * Delete expired sessions (cleanup)
 */
export function cleanupExpiredSessions(): void {
  const sessions = getSessions();
  const now = new Date().getTime();
  const active = sessions.filter(s => 
    s.status === 'completed' || new Date(s.expiresAt).getTime() > now
  );
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(active));
}
