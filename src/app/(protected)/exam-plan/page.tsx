import { ExamPlanContent } from '@/features/exam-plan/components/exam-plan-content';

export default function ExamPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Exam Plan</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Track your pacing, set daily targets, and see subject-by-subject progress.
        </p>
      </div>
      <ExamPlanContent />
    </div>
  );
}
