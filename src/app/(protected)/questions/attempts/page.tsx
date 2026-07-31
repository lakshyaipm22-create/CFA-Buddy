import { AttemptsListClient } from '@/features/question-bank/components/attempts-list-client';

export default function AttemptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Practice Attempts
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          View your completed practice attempts and track improvement over time.
        </p>
      </div>
      <AttemptsListClient />
    </div>
  );
}
