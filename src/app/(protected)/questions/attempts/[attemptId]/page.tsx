import { AttemptDashboard } from '@/features/question-bank/components/attempt-dashboard';

interface AttemptDetailPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptDetailPage({ params }: AttemptDetailPageProps) {
  const { attemptId } = await params;

  return <AttemptDashboard attemptId={attemptId} />;
}
