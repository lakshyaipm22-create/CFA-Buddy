import { FileText, BookOpen, Target, CheckSquare } from 'lucide-react';
import { InsightsContent } from '@/features/insights/components/insights-content';
import { RelatedActions } from '@/shared/components/ui/related-actions';

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

      <RelatedActions
        items={[
          {
            href: '/weekly-report',
            icon: FileText,
            label: 'Weekly Report',
            description: 'Summary overview',
          },
          {
            href: '/questions',
            icon: BookOpen,
            label: 'Questions',
            description: 'Practice more',
          },
          {
            href: '/exam-plan',
            icon: Target,
            label: 'Exam Plan',
            description: 'Adjust targets',
          },
          {
            href: '/los-tracker',
            icon: CheckSquare,
            label: 'LOS Tracker',
            description: 'Coverage gaps',
          },
        ]}
      />
    </div>
  );
}
