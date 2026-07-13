'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PracticeContent } from '@/features/practice/components/practice-content';

function PracticePageInner() {
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject') ?? undefined;
  const topic = searchParams.get('topic') ?? undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Spaced Practice
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          {subject
            ? `Practicing: ${subject}${topic ? ` - ${topic}` : ''}`
            : 'Daily review with spaced repetition. Rate each question to optimize your study schedule.'}
        </p>
      </div>
      <PracticeContent filterSubject={subject} filterTopic={topic} />
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent-primary)' }}
        />
      </div>
    }>
      <PracticePageInner />
    </Suspense>
  );
}
