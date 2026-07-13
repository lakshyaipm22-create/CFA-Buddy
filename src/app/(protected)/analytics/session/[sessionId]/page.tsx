import { SessionAnalysis } from '@/features/analytics/components/session-analysis';

export const metadata = {
  title: 'Session Analysis | CFA Buddy',
  description: 'Detailed breakdown of your practice session performance.',
};

interface SessionAnalysisPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionAnalysisPage({ params }: SessionAnalysisPageProps) {
  const { sessionId } = await params;
  return <SessionAnalysis sessionId={sessionId} />;
}
