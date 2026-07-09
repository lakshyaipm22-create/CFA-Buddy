import { SessionReview } from '@/features/question-bank/components/session-review';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { sessionId } = await params;

  return <SessionReview sessionId={sessionId} />;
}
