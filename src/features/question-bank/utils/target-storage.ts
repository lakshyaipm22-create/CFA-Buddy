const TARGETS_KEY = 'cfa-buddy-targets';
const EXAM_DATE_KEY = 'cfa-buddy-exam-date';

/**
 * Get all target scores from localStorage.
 * Returns a map of module name to target percentage.
 */
export function getTargets(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(TARGETS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Set the target percentage for a specific module.
 */
export function setTarget(module: string, targetPercentage: number): void {
  if (typeof window === 'undefined') return;
  const targets = getTargets();
  targets[module] = Math.max(50, Math.min(100, targetPercentage));
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
}

/**
 * Remove the target for a specific module.
 */
export function clearTarget(module: string): void {
  if (typeof window === 'undefined') return;
  const targets = getTargets();
  delete targets[module];
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
}

/**
 * Get the user's exam date from localStorage.
 * Returns ISO date string or null if not set.
 */
export function getExamDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EXAM_DATE_KEY);
}

/**
 * Set the user's exam date in localStorage.
 */
export function setExamDate(date: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXAM_DATE_KEY, date);
}
