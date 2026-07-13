'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Target, ArrowLeft } from 'lucide-react';
import { Confetti } from '@/features/gamification/components/confetti';

interface ReviewCelebrationProps {
  itemsCompleted: number;
  timeSpentSeconds: number;
  questionsCorrect: number;
  questionsTotal: number;
}

export function ReviewCelebration({
  itemsCompleted,
  timeSpentSeconds,
  questionsCorrect,
  questionsTotal,
}: ReviewCelebrationProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const minutes = Math.max(1, Math.round(timeSpentSeconds / 60));
  const questionAccuracy = questionsTotal > 0
    ? Math.round((questionsCorrect / questionsTotal) * 100)
    : 0;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Confetti show={true} />

      <div className="rounded-full p-4" style={{ background: 'rgba(0, 132, 61, 0.1)' }}>
        <CheckCircle2 className="h-16 w-16" style={{ color: '#00843D' }} />
      </div>

      <h2 className="mt-6 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
        Review Complete!
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        Great work! You have completed all your due items for today.
      </p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5" style={{ color: '#C5A258' }}>
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-2xl font-bold">{itemsCompleted}</span>
          </div>
          <span className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Items Reviewed
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5" style={{ color: '#002B5C' }}>
            <Clock className="h-4 w-4" />
            <span className="text-2xl font-bold">{minutes}m</span>
          </div>
          <span className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Time Spent
          </span>
        </div>

        {questionsTotal > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5" style={{ color: '#00843D' }}>
              <Target className="h-4 w-4" />
              <span className="text-2xl font-bold">{questionAccuracy}%</span>
            </div>
            <span className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Accuracy
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleBack}
        className="mt-10 flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors hover:opacity-90"
        style={{ background: 'var(--accent-primary)', color: '#ffffff' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>
    </div>
  );
}
