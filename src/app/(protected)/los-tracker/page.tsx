import { LOSTrackerContent } from '@/features/los-tracker/components/los-tracker-content';

export default function LOSTrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LOS Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Track your progress across all Learning Outcome Statements. Click tiles to update status.
        </p>
      </div>
      <LOSTrackerContent />
    </div>
  );
}
