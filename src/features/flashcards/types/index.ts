export type CardState = 'new' | 'learning' | 'review' | 'mastered';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  topic: string | null;
  state: CardState;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  nextReview: string; // ISO date
  lastReview: string | null;
  createdAt: string;
}

export interface FlashcardStats {
  total: number;
  dueToday: number;
  mastered: number;
  retention: number; // percentage
  studiedToday: number;
}
