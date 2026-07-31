'use client';

import { useEffect } from 'react';
import { SessionConfigurator } from '@/features/question-bank/components/session-configurator';
import { QuestionAnalytics } from '@/features/question-bank/components/question-analytics';
import { RecentAttemptsSection } from '@/features/question-bank/components/recent-attempts-section';
import { RecentSessions } from '@/features/question-bank/components/recent-sessions';
import { SmartSessionCard } from '@/features/question-bank/components/smart-session-card';
import { useImportedQuestions } from '@/features/question-bank/hooks/useImportedQuestions';
import { cleanupOldSessions } from '@/features/question-bank/utils/session-storage';

export default function QuestionsPage() {
  const { isLoading, questions: importedQuestions } = useImportedQuestions();

  useEffect(() => {
    cleanupOldSessions();
  }, []);

  const hasImportedQuestions = importedQuestions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Question Bank</h1>
        <p className="mt-1 text-zinc-400">
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
      <SmartSessionCard />
      <SessionConfigurator />
      <RecentAttemptsSection />
      <RecentSessions />
      <QuestionAnalytics />
    </div>
  );
}
