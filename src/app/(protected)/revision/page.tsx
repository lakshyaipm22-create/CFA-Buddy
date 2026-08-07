import { RevisionPlanner } from '@/features/revision/components/revision-planner';

export default function RevisionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Revision Planner</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Spaced repetition schedule for each subject. Subjects needing the most revision appear first.
        </p>
      </div>
      <RevisionPlanner />
    </div>
  );
}
