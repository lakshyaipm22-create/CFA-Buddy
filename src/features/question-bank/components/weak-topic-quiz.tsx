'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, TrendingDown, Zap } from 'lucide-react';
import type { QuestionSession, SessionConfig } from '../types';
import { saveSession } from '../utils/session-storage';
import { getWeakTopics, generateWeakTopicQuiz } from '../utils/weak-topic-engine';
import type { WeakTopic } from '../utils/weak-topic-engine';

export function WeakTopicQuiz() {
  const router = useRouter();
  const [weakTopics] = useState<WeakTopic[]>(() => getWeakTopics());

  if (weakTopics.length === 0) return null;

  const topFive = weakTopics.slice(0, 5);

  const handleStartQuiz = () => {
    const questionIds = generateWeakTopicQuiz(15);
    if (questionIds.length === 0) return;

    const config: SessionConfig = {
      questionCount: questionIds.length,
      timeLimit: null,
    };

    const session: QuestionSession = {
      id: crypto.randomUUID(),
      mode: 'WeakTopic',
      config,
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionIds,
      attempts: [],
      currentIndex: 0,
      flaggedIds: [],
      bookmarkedIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    saveSession(session);
    router.push(`/questions/session/${session.id}`);
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" style={{ color: 'var(--accent-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Weak Topic Focus
          </h2>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: 'rgba(197, 162, 88, 0.15)', color: 'var(--accent-secondary)' }}
        >
          Recommended
        </span>
      </div>

      <p className="mb-4 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        Based on your practice history, these topics need the most attention.
        A targeted quiz focuses on your weakest areas to maximize improvement.
      </p>

      {/* Weak Topics List */}
      <div className="mb-5 space-y-3">
        {topFive.map((wt) => (
          <div key={`${wt.subject}::${wt.topic}`} className="flex items-center gap-3">
            <TrendingDown
              className="h-4 w-4 flex-shrink-0"
              style={{ color: wt.accuracy < 0.4 ? '#ef4444' : '#f59e0b' }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="truncate text-sm font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  {wt.topic}
                </span>
                <span
                  className="flex-shrink-0 text-xs font-medium"
                  style={{ color: wt.accuracy < 0.4 ? '#ef4444' : '#f59e0b' }}
                >
                  {Math.round(wt.accuracy * 100)}%
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--nav-hover-bg)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round(wt.accuracy * 100)}%`,
                      backgroundColor: wt.accuracy < 0.4 ? '#ef4444' : '#f59e0b',
                    }}
                  />
                </div>
                <span className="flex-shrink-0 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {wt.incorrectCount} wrong / {wt.totalCount} attempted
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Start Quiz Button */}
      <button
        onClick={handleStartQuiz}
        className="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors hover:opacity-90"
        style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
      >
        <Zap className="h-4 w-4" />
        Start Weak Topic Quiz (15 questions)
      </button>
    </div>
  );
}
