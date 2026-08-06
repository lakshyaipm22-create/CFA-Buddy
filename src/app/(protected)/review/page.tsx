import { ReviewQueueContent } from '@/features/review-queue/components/review-queue-content';
import { RelatedActions } from '@/shared/components/ui/related-actions';

export const metadata = {
  title: 'Smart Review | CFA Buddy',
  description: 'Review all due flashcards, practice questions, and revision subjects in one unified queue.',
};

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Smart Review
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Review all due flashcards, practice questions, and revision subjects in one unified queue.
        </p>
      </div>
      <ReviewQueueContent />

      <RelatedActions
        items={[
          {
            href: '/practice',
            icon: 'Repeat',
            label: 'Practice',
            description: 'Deep dive sessions',
          },
          {
            href: '/flashcards',
            icon: 'Layers',
            label: 'Flashcards',
            description: 'Quick review cards',
          },
        ]}
      />
    </div>
  );
}
