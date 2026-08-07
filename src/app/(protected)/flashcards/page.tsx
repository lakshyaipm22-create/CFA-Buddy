import { RelatedActions } from '@/shared/components/ui/related-actions';
import dynamic from 'next/dynamic';

const FlashcardDeck = dynamic(
  () => import('@/features/flashcards/components/flashcard-deck').then((m) => m.FlashcardDeck),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="h-[240px] animate-pulse rounded-2xl border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }} />
        <div className="flex justify-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-20 animate-pulse rounded-lg" style={{ background: 'var(--nav-hover-bg)' }} />
          ))}
        </div>
      </div>
    ),
  }
);

export default function FlashcardsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Flashcards</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Spaced repetition review — cards appear when they&apos;re due based on SM-2 algorithm.
        </p>
      </div>

      <FlashcardDeck />

      <RelatedActions
        items={[
          {
            href: '/questions',
            icon: 'BookOpen',
            label: 'Questions',
            description: 'Full practice sessions',
          },
          {
            href: '/review',
            icon: 'ClipboardList',
            label: 'Review',
            description: 'Smart review queue',
          },
        ]}
      />
    </div>
  );
}
