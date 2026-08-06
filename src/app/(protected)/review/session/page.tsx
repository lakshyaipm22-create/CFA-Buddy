import { ReviewSessionContent } from '@/features/spaced-repetition/components/review-session';

export const metadata = {
  title: 'Review Session | CFA Buddy',
  description: 'Spaced repetition review session - rate your recall to optimize learning intervals.',
};

export default function ReviewSessionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
        Review Session
      </h1>
      <ReviewSessionContent />
    </div>
  );
}
