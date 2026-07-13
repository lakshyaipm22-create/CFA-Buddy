'use client';

import { PracticeContent } from '@/features/practice/components/practice-content';

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Spaced Practice
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Daily review with spaced repetition. Rate each question to optimize your study schedule.
        </p>
      </div>
      <PracticeContent />
    </div>
  );
}
