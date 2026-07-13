import { AnalyticsDashboard } from '@/features/analytics/components/analytics-dashboard';

export const metadata = {
  title: 'Test Analytics | CFA Buddy',
  description: 'Detailed analytics and history for all your CFA practice sessions.',
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
