import type { MockExamHistory, MockExamResult, ExamProgress } from '../types';

const HISTORY_KEY = 'cfa-buddy-mock-exams';
const PROGRESS_KEY = 'cfa-buddy-mock-exam-progress';

/**
 * Retrieves mock exam history from localStorage.
 */
export function getMockExamHistory(): MockExamHistory {
  if (typeof window === 'undefined') return { exams: [] };
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as MockExamHistory;
    }
  } catch {
    // ignore parse errors
  }
  return { exams: [] };
}

/**
 * Saves a completed mock exam result.
 */
export function saveMockExamResult(result: MockExamResult): void {
  const history = getMockExamHistory();
  history.exams.push(result);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * Retrieves a specific exam result by ID.
 */
export function getMockExamById(examId: string): MockExamResult | null {
  const history = getMockExamHistory();
  return history.exams.find((e) => e.id === examId) ?? null;
}

/**
 * Saves current exam progress for resuming.
 */
export function saveExamProgress(progress: ExamProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Retrieves in-progress exam state.
 */
export function getExamProgress(): ExamProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as ExamProgress;
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Clears in-progress exam state.
 */
export function clearExamProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}
