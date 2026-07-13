import type { GamificationState } from '../types';

const STORAGE_KEY = 'cfa-buddy-gamification';

function getDefaultState(): GamificationState {
  return {
    xp: 0,
    level: 0,
    streakDays: 0,
    lastActivityDate: '',
    weeklyQuestionsAnswered: 0,
    weekStartDate: getWeekStart(),
    badges: [],
    dailyCounts: {},
  };
}

/**
 * Read gamification state from localStorage.
 */
export function getGamificationState(): GamificationState {
  if (typeof window === 'undefined') return getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return JSON.parse(raw) as GamificationState;
  } catch {
    return getDefaultState();
  }
}

/**
 * Save gamification state to localStorage.
 */
export function saveGamificationState(state: GamificationState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Calculate level from XP: Level = floor(sqrt(totalXP / 100))
 */
export function getLevel(xp: number): number {
  if (xp <= 0) return 0;
  return Math.floor(Math.sqrt(xp / 100));
}

/**
 * Get XP needed to reach the next level.
 * Next level threshold = (currentLevel + 1)^2 * 100
 */
export function getXPForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const currentLevel = getLevel(xp);
  const currentLevelThreshold = currentLevel * currentLevel * 100;
  const nextLevelThreshold = (currentLevel + 1) * (currentLevel + 1) * 100;
  const xpIntoLevel = xp - currentLevelThreshold;
  const xpNeededForLevel = nextLevelThreshold - currentLevelThreshold;
  const progress = xpNeededForLevel > 0 ? Math.min(xpIntoLevel / xpNeededForLevel, 1) : 0;

  return {
    current: xpIntoLevel,
    needed: xpNeededForLevel,
    progress,
  };
}

/**
 * Add XP and recalculate level.
 */
export function addXP(amount: number): GamificationState {
  const state = getGamificationState();
  state.xp += amount;
  state.level = getLevel(state.xp);
  saveGamificationState(state);
  return state;
}

/**
 * Check and update the daily streak.
 * Streak requires >= 10 questions answered on consecutive days.
 */
export function checkAndUpdateStreak(totalQuestionsToday: number): GamificationState {
  const state = getGamificationState();
  const today = getToday();

  // Update daily count
  state.dailyCounts[today] = totalQuestionsToday;

  // Update last activity date
  state.lastActivityDate = today;

  // Recalculate streak from daily counts
  state.streakDays = calculateStreak(state.dailyCounts);

  // Update weekly questions
  const currentWeekStart = getWeekStart();
  if (state.weekStartDate !== currentWeekStart) {
    state.weekStartDate = currentWeekStart;
    state.weeklyQuestionsAnswered = 0;
  }
  // Sum daily counts for this week
  state.weeklyQuestionsAnswered = getWeeklyTotal(state.dailyCounts);

  state.level = getLevel(state.xp);
  saveGamificationState(state);
  return state;
}

/**
 * Calculate consecutive days with >= 10 questions going backwards from today.
 */
function calculateStreak(dailyCounts: Record<string, number>): number {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getDateString(date);
    const count = dailyCounts[dateStr] ?? 0;

    if (count >= 10) {
      streak++;
    } else if (i === 0) {
      // Today doesn't have 10 yet, check if yesterday started the streak
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get total questions answered this week (Monday-Sunday).
 */
function getWeeklyTotal(dailyCounts: Record<string, number>): number {
  const weekStart = getWeekStartDate();
  let total = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = getDateString(date);
    total += dailyCounts[dateStr] ?? 0;
  }

  return total;
}

function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekStart(): string {
  return getDateString(getWeekStartDate());
}

function getToday(): string {
  return getDateString(new Date());
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
