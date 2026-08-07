import Link from 'next/link';
import { WeeklyReportContent } from '@/features/weekly-report/components/weekly-report-content';

export default function WeeklyReportPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Weekly Report</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          This report is also available in{' '}
          <Link href="/insights" className="text-[#C5A258] hover:underline">Insights</Link>.
        </p>
      </div>
      <WeeklyReportContent />
    </div>
  );
}
