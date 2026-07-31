import { RevisionPlanner } from '@/features/revision/components/revision-planner';

export default function RevisionPage() {
  return (
    <div className="space-y-6">
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
