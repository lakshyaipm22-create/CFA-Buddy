'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layers, ClipboardList, Sparkles } from 'lucide-react';
import { SessionConfigurator } from '@/features/question-bank/components/session-configurator';
import { RecentAttemptsSection } from '@/features/question-bank/components/recent-attempts-section';
import { RecentSessions } from '@/features/question-bank/components/recent-sessions';
import { useImportedQuestions } from '@/features/question-bank/hooks/useImportedQuestions';
import { cleanupOldSessions } from '@/features/question-bank/utils/session-storage';
import { RelatedActions } from '@/shared/components/ui/related-actions';
import { CollapsibleSection } from '@/shared/components/ui/collapsible-section';

function QuestionsPageInner() {
  const { isLoading, questions: importedQuestions } = useImportedQuestions();
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get('subject') || undefined;

  useEffect(() => {
    cleanupOldSessions();
  }, []);

  const hasImportedQuestions = importedQuestions.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Question Bank</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Configure and start a practice session.
        </p>
      </div>

      {isLoading && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--foreground-secondary)',
          }}
        >
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading 1,000 questions...
        </div>
      )}

      {!isLoading && !hasImportedQuestions && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--foreground-secondary)',
          }}
        >
          Want more questions? Visit{' '}
          <a
            href="/admin/import"
            className="underline"
            style={{ color: 'var(--accent-secondary)' }}
          >
            Admin &gt; Import
          </a>{' '}
          to load your question bank.
        </div>
      )}

      <SessionConfigurator initialSubject={subjectParam} />

      <CollapsibleSection title="Recent Activity">
        <RecentAttemptsSection />
        <RecentSessions />
      </CollapsibleSection>

      <RelatedActions
        items={[
          {
            href: '/practice/adaptive',
            icon: Sparkles,
            label: 'Adaptive Practice',
            description: 'AI-powered difficulty adjustment',
          },
          {
            href: '/flashcards',
            icon: Layers,
            label: 'Flashcards',
            description: 'Quick review cards',
          },
          {
            href: '/review',
            icon: ClipboardList,
            label: 'Review',
            description: 'Smart review queue',
          },
        ]}
      />
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent-primary)' }}
        />
      </div>
    }>
      <QuestionsPageInner />
    </Suspense>
  );
}
