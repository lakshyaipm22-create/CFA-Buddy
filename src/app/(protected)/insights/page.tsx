'use client';

import { InsightsContent } from '@/features/insights/components/insights-content';
import { WeeklyReportContent } from '@/features/weekly-report/components/weekly-report-content';
import { LOSTrackerContent } from '@/features/los-tracker/components/los-tracker-content';
import { TabsNav } from '@/shared/components/ui/tabs-nav';
import { RelatedActions } from '@/shared/components/ui/related-actions';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'weekly-report', label: 'Weekly Report' },
  { id: 'los-tracker', label: 'LOS Tracker' },
];

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Progress Insights</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Deep analytics on your study patterns, predicted score, and improvement trends.
        </p>
      </div>

      <TabsNav tabs={tabs} defaultTab="overview">
        {(activeTab) => (
          <>
            {activeTab === 'overview' && <InsightsContent />}
            {activeTab === 'weekly-report' && <WeeklyReportContent />}
            {activeTab === 'los-tracker' && <LOSTrackerContent />}
          </>
        )}
      </TabsNav>

      <RelatedActions
        items={[
          {
            href: '/insights/prediction',
            icon: 'Target',
            label: 'Pass Prediction',
            description: 'AI-powered pass probability',
          },
          {
            href: '/questions',
            icon: 'BookOpen',
            label: 'Questions',
            description: 'Practice more',
          },
          {
            href: '/review',
            icon: 'Repeat',
            label: 'Review',
            description: 'Smart review queue',
          },
        ]}
      />
    </div>
  );
}
