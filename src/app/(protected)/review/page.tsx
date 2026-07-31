import { ReviewQueueContent } from '@/features/review-queue/components/review-queue-content';

export const metadata = {
  title: 'Smart Review | CFA Buddy',
  description: 'Review all due flashcards, practice questions, and revision subjects in one unified queue.',
};

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
        Smart Review
      </h1>
      <ReviewQueueContent />
    </div>
  );
}
