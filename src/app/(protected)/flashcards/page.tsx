import { FlashcardDeck } from '@/features/flashcards/components/flashcard-deck';

export default function FlashcardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Flashcards</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Spaced repetition review — cards appear when they&apos;re due based on SM-2 algorithm.
        </p>
      </div>
      <FlashcardDeck />
    </div>
  );
}
