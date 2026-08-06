import { QuestionReviewTable } from '@/features/question-bank/components/question-review-table';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

/**
 * Admin page for reviewing imported questions.
 * Shows pending questions from the database, or sample questions for development.
 */
export default async function AdminQuestionsPage() {
  let questions = sampleQuestions.map((q) => ({
    ...q,
    verificationStatus: 'pending' as const,
  }));

  let subjects: string[] = [];
  let topics: string[] = [];
  let providers: string[] = [];

  if (isDatabaseAvailable()) {
    const { prisma } = await import('@/shared/lib/prisma/client');
    try {
      const pendingQuestions = await prisma.question.findMany({
        where: { verificationStatus: 'pending' },
        include: { topic: { include: { reading: { include: { subject: true } } } }, provider: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      questions = pendingQuestions.map((q: typeof pendingQuestions[number]) => ({
        id: q.id,
        questionText: q.questionText,
        answerChoices: q.answerChoices as Array<{
          label: string;
          text: string;
          isCorrect: boolean;
          explanation: string;
        }>,
        difficulty: q.difficulty as 'Easy' | 'Medium' | 'Hard',
        subject: q.topic?.reading?.subject?.name ?? 'Unknown',
        reading: null,
        topic: q.topic?.name ?? null,
        provider: q.provider?.name ?? 'Unknown',
        questionSourceFile: q.questionSourceFile,
        verificationStatus: q.verificationStatus,
      }));
    } catch {
      // Fall back to sample questions if DB query fails
    }
  }

  // Extract filter options from available questions
  subjects = [...new Set(questions.map((q) => q.subject))].sort();
  topics = [...new Set(questions.map((q) => q.topic).filter(Boolean) as string[])].sort();
  providers = [...new Set(questions.map((q) => q.provider))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Question Review</h1>
        <p className="mt-1 text-zinc-400">
          Review and verify imported questions before they appear in practice sessions.
        </p>
      </div>
      <QuestionReviewTable
        initialQuestions={questions}
        subjects={subjects}
        topics={topics}
        providers={providers}
      />
    </div>
  );
}
