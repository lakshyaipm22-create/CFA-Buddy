import { StudyPlanContent } from '@/features/study-plan/components/study-plan-content';

export default function StudyPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Study Planner</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Your personalized day-by-day study schedule, optimized for weak subjects with high exam weight.
        </p>
      </div>
      <StudyPlanContent />
    </div>
  );
}
