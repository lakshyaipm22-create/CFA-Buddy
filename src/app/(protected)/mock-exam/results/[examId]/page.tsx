import { MockExamResults } from '@/features/mock-exam/components/mock-exam-results';

interface Props {
  params: Promise<{ examId: string }>;
}

export default async function MockExamResultsPage({ params }: Props) {
  const { examId } = await params;
  return <MockExamResults examId={examId} />;
}
