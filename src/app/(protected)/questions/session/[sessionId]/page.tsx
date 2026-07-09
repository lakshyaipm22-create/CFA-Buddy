import { ActiveTestSession } from '@/features/question-bank/components/active-test-session';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { sessionId } = await params;

  return <ActiveTestSession sessionId={sessionId} />;
}
