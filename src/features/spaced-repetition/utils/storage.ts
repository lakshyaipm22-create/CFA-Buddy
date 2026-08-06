import type { ReviewSession, ReviewHistory, DailyStats, ScheduledCard } from '../types';

const SESSIONS_KEY = 'cfa-buddy-review-sessions';
const HISTORY_KEY = 'cfa-buddy-review-history';
const DAILY_STATS_KEY = 'cfa-buddy-review-daily-stats';
const SCHEDULED_CARDS_KEY = 'cfa-buddy-scheduled-cards';
const REMINDER_DISMISSED_KEY = 'cfa-buddy-review-reminder-dismissed';

// --- Review Sessions ---

export function getReviewSessions(): ReviewSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveReviewSession(session: ReviewSession): void {
  const sessions = getReviewSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

// --- Review History ---

export function getReviewHistory(): ReviewHistory[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addReviewHistory(entry: ReviewHistory): void {
  const history = getReviewHistory();
  history.push(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- Daily Stats ---

export function getDailyStats(): DailyStats[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DAILY_STATS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function updateDailyStats(rating: 'again' | 'hard' | 'good' | 'easy', easeFactor: number, sessionId: string): void {
  const stats = getDailyStats();
  const today = new Date().toISOString().slice(0, 10);
  let todayStats = stats.find(s => s.date === today);

  if (!todayStats) {
    todayStats = {
      date: today,
      cardsReviewed: 0,
      cardsCorrect: 0,
      averageEaseFactor: 2.5,
      sessionIds: [],
    };
    stats.push(todayStats);
  }

  todayStats.cardsReviewed += 1;
  if (rating === 'good' || rating === 'easy') {
    todayStats.cardsCorrect += 1;
  }

  // Running average of ease factor
  const totalEase = todayStats.averageEaseFactor * (todayStats.cardsReviewed - 1) + easeFactor;
  todayStats.averageEaseFactor = Math.round((totalEase / todayStats.cardsReviewed) * 100) / 100;

  if (!todayStats.sessionIds.includes(sessionId)) {
    todayStats.sessionIds.push(sessionId);
  }

  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
}

export function getTodayStats(): DailyStats | null {
  const stats = getDailyStats();
  const today = new Date().toISOString().slice(0, 10);
  return stats.find(s => s.date === today) ?? null;
}

// --- Scheduled Cards ---

export function getScheduledCards(): ScheduledCard[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SCHEDULED_CARDS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveScheduledCards(cards: ScheduledCard[]): void {
  localStorage.setItem(SCHEDULED_CARDS_KEY, JSON.stringify(cards));
}

export function updateScheduledCard(card: ScheduledCard): void {
  const cards = getScheduledCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  saveScheduledCards(cards);
}

// --- Reminder Dismissal ---

export function isReminderDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(REMINDER_DISMISSED_KEY);
    if (!raw) return false;
    const { date } = JSON.parse(raw);
    return date === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

export function dismissReminderToday(): void {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(REMINDER_DISMISSED_KEY, JSON.stringify({ date: today }));
}
