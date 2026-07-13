export type ReviewItemType = 'flashcard' | 'question' | 'revision';

export interface ReviewItem {
  id: string;
  type: ReviewItemType;
  title: string;
  subject: string;
  data: unknown;
}

export interface ReviewQueueState {
  items: ReviewItem[];
  currentIndex: number;
  completed: boolean;
  startedAt: string | null;
}

export interface ReviewCompletion {
  date: string;
  itemsCompleted: number;
  timeSpentSeconds: number;
  questionsCorrect: number;
  questionsTotal: number;
}
