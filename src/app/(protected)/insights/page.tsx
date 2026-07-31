import { InsightsContent } from '@/features/insights/components/insights-content';

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Progress Insights</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Deep analytics on your study patterns, predicted score, and improvement trends.
        </p>
      </div>
      <InsightsContent />
    </div>
  );
}
