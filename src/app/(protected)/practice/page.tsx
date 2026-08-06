'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Layers } from 'lucide-react';
import { PracticeContent } from '@/features/practice/components/practice-content';
import { RelatedActions } from '@/shared/components/ui/related-actions';

function PracticePageInner() {
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject') ?? undefined;
  const topic = searchParams.get('topic') ?? undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
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

      <RelatedActions
        items={[
          {
            href: '/questions',
            icon: BookOpen,
            label: 'Questions',
            description: 'Full practice sessions',
          },
          {
            href: '/flashcards',
            icon: Layers,
            label: 'Flashcards',
            description: 'Quick review cards',
          },
        ]}
      />
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
