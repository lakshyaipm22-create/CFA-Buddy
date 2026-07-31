import { Repeat, Layers, AlertCircle } from 'lucide-react';
import { ReviewQueueContent } from '@/features/review-queue/components/review-queue-content';
import { RelatedActions } from '@/shared/components/ui/related-actions';

export const metadata = {
  title: 'Smart Review | CFA Buddy',
  description: 'Review all due flashcards, practice questions, and revision subjects in one unified queue.',
};

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
        Smart Review
      </h1>
      <ReviewQueueContent />

      <RelatedActions
        items={[
          {
            href: '/practice',
            icon: Repeat,
            label: 'Practice',
            description: 'Deep dive sessions',
          },
          {
            href: '/flashcards',
            icon: Layers,
            label: 'Flashcards',
            description: 'Quick review cards',
          },
          {
            href: '/mistakes',
            icon: AlertCircle,
            label: 'Mistakes',
            description: 'Error patterns',
          },
        ]}
      />
    </div>
  );
}
