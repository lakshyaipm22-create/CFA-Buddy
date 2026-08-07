import Link from 'next/link';
import { LOSTrackerContent } from '@/features/los-tracker/components/los-tracker-content';

export default function LOSTrackerPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>LOS Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Track your progress across all Learning Outcome Statements. Also available in{' '}
          <Link href="/insights" className="text-[#C5A258] hover:underline">Insights</Link>.
        </p>
      </div>
      <LOSTrackerContent />
    </div>
  );
}
