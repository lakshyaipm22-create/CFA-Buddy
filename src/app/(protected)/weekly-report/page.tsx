import type { Metadata } from 'next';
import { WeeklyReportContent } from '@/features/weekly-report/components/weekly-report-content';

export const metadata: Metadata = {
  title: 'Weekly Report | CFA Buddy',
  description: 'Review your weekly study performance, trends, and suggested focus areas.',
};

export default function WeeklyReportPage() {
  return <WeeklyReportContent />;
}
