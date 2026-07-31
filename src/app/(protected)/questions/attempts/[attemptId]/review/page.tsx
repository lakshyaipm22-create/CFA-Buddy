import { AttemptReview } from '@/features/question-bank/components/attempt-review';

interface AttemptReviewPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptReviewPage({ params }: AttemptReviewPageProps) {
  const { attemptId } = await params;

  return <AttemptReview attemptId={attemptId} />;
}
