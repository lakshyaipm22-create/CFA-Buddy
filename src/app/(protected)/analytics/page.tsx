import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/features/analytics/components/analytics-dashboard';
import { AnalyticsDashboardSkeleton } from '@/features/analytics/components/analytics-skeleton';

export const metadata = {
  title: 'Test Analytics | CFA Buddy',
  description: 'Detailed analytics and history for all your CFA practice sessions.',
};

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsDashboardSkeleton />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
