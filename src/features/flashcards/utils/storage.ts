import type { Flashcard } from '../types';

const STORAGE_KEY = 'cfa-buddy-flashcards';
const REVIEWED_TODAY_KEY = 'cfa-buddy-flashcards-reviewed-today';

export function getFlashcards(): Flashcard[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

export function saveFlashcards(cards: Flashcard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addFlashcard(card: Flashcard): void {
  const cards = getFlashcards();
  cards.push(card);
  saveFlashcards(cards);
}

export function updateFlashcard(updated: Flashcard): void {
  const cards = getFlashcards();
  const idx = cards.findIndex(c => c.id === updated.id);
  if (idx >= 0) cards[idx] = updated;
  saveFlashcards(cards);
}

export function getReviewedToday(): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem(REVIEWED_TODAY_KEY);
  if (!stored) return 0;
  try {
    const { date, count } = JSON.parse(stored);
    return date === today ? count : 0;
  } catch { return 0; }
}

export function incrementReviewedToday(): void {
  const today = new Date().toISOString().slice(0, 10);
  const current = getReviewedToday();
  localStorage.setItem(REVIEWED_TODAY_KEY, JSON.stringify({ date: today, count: current + 1 }));
}
