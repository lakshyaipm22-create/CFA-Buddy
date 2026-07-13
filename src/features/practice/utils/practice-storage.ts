import type { PracticeHistory, PracticeStats } from '../types';

const HISTORY_KEY = 'cfa-buddy-practice-history';
const STATS_KEY = 'cfa-buddy-practice-stats';

/**
 * Get practice history for all questions.
 */
export function getPracticeHistory(): Record<string, PracticeHistory> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Save the entire practice history record.
 */
export function savePracticeHistory(history: Record<string, PracticeHistory>): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * Get or initialize practice stats for today.
 */
export function getPracticeStats(): PracticeStats {
  if (typeof window === 'undefined') {
    return { date: '', count: 0, streakDays: 0, lastPracticeDate: '' };
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return { date: getToday(), count: 0, streakDays: 0, lastPracticeDate: '' };
    }
    const stats: PracticeStats = JSON.parse(raw);
    // If stats are from a previous day, reset daily count but compute streak
    if (stats.date !== getToday()) {
      const yesterday = getDateString(new Date(Date.now() - 86400000));
      const streakDays = stats.lastPracticeDate === yesterday
        ? stats.streakDays
        : stats.lastPracticeDate === getToday()
          ? stats.streakDays
          : 0;
      return { date: getToday(), count: 0, streakDays, lastPracticeDate: stats.lastPracticeDate };
    }
    return stats;
  } catch {
    return { date: getToday(), count: 0, streakDays: 0, lastPracticeDate: '' };
  }
}

/**
 * Increment today's practice count and update streak.
 */
export function incrementPracticeCount(): PracticeStats {
  const stats = getPracticeStats();
  const today = getToday();

  if (stats.lastPracticeDate === today) {
    // Already practiced today, just increment count
    stats.count += 1;
  } else {
    // First practice of the day
    const yesterday = getDateString(new Date(Date.now() - 86400000));
    if (stats.lastPracticeDate === yesterday) {
      stats.streakDays += 1;
    } else if (stats.lastPracticeDate !== today) {
      // Streak broken (unless this is the very first practice)
      stats.streakDays = stats.lastPracticeDate === '' ? 1 : 1;
    }
    stats.count += 1;
    stats.lastPracticeDate = today;
    stats.date = today;
  }

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * Get count of questions due tomorrow.
 */
export function getDueTomorrowCount(): number {
  const history = getPracticeHistory();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  const tomorrowEnd = tomorrow.toISOString();

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayEnd = today.toISOString();

  return Object.values(history).filter(
    h => h.nextDue > todayEnd && h.nextDue <= tomorrowEnd
  ).length;
}

function getToday(): string {
  return getDateString(new Date());
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
