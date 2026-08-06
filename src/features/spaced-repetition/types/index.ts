export type CardState = 'new' | 'learning' | 'review' | 'mastered';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface ScheduledCard {
  id: string;
  front: string;
  back: string;
  subject: string;
  topic: string | null;
  state: CardState;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  nextReview: string; // ISO date string
  lastReview: string | null;
  createdAt: string;
}

export interface ReviewSession {
  id: string;
  startedAt: string;
  completedAt: string | null;
  cardsReviewed: number;
  ratings: Record<ReviewRating, number>;
  averageEaseFactor: number;
}

export interface ReviewHistory {
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  previousInterval: number;
  newInterval: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  cardsReviewed: number;
  cardsCorrect: number; // good or easy
  averageEaseFactor: number;
  sessionIds: string[];
}
