'use client';

import { useState, useMemo, useCallback } from 'react';
import type { QuestionAttempt } from '@/features/question-bank/types';
import { ErrorAnalytics } from './error-analytics';
import { MistakeFilterBar, type MistakeFilters } from './mistake-filter-bar';
import { generateRetest } from '../actions/retest';
import { useListNavigation } from '@/shared/hooks/use-list-navigation';
import { useCursorPagination } from '@/shared/hooks/use-cursor-pagination';

interface MistakeEntry {
  attempt: QuestionAttempt;
  questionText: string;
  subject: string;
  topic: string;
  classification: string;
}

interface SessionData {
  status: string;
  config?: { subject?: string; topic?: string; [key: string]: unknown };
  attempts?: Array<Record<string, unknown>>;
}

export function MistakeBook() {
  const [sessions] = useState<SessionData[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SessionData[];
    } catch {
      return [];
    }
  });

  const [filters, setFilters] = useState<MistakeFilters>({
    errorType: 'all',
    subject: '',
    topic: '',
    dateFrom: '',
    dateTo: '',
  });
  const [retestLoading, setRetestLoading] = useState(false);

  const mistakes = useMemo<MistakeEntry[]>(() => {
    const allMistakes: MistakeEntry[] = [];

    for (const session of sessions) {
      const sessionSubject = session.config?.subject ?? 'CFA Level I';
      const sessionTopic = session.config?.topic ?? '';
      for (const attempt of (session.attempts ?? []) as unknown as QuestionAttempt[]) {
        if (!attempt.correct) {
          allMistakes.push({
            attempt,
            questionText: attempt.questionId,
            subject: sessionSubject,
            topic: sessionTopic,
            classification: attempt.errorClassification ?? 'Unclassified',
          });
        }
      }
    }

    return allMistakes.reverse();
  }, [sessions]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (filters.errorType !== 'all' && m.classification !== filters.errorType) return false;
      if (filters.subject && m.subject !== filters.subject) return false;
      if (filters.topic && m.topic !== filters.topic) return false;
      if (filters.dateFrom) {
        const ts = new Date(m.attempt.timestamp);
        if (ts < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        const ts = new Date(m.attempt.timestamp);
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        if (ts >= endDate) return false;
      }
      return true;
    });
  }, [mistakes, filters]);

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    for (const m of mistakes) {
      if (m.topic) topics.add(m.topic);
    }
    return Array.from(topics).sort();
  }, [mistakes]);

  const classificationCounts = mistakes.reduce((acc, m) => {
    acc[m.classification] = (acc[m.classification] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleGenerateRetest = useCallback(async () => {
    setRetestLoading(true);
    try {
      const questionIds = filteredMistakes.map((m) => m.attempt.questionId);
      const uniqueIds = [...new Set(questionIds)];
      const result = await generateRetest({
        questionIds: uniqueIds,
        subject: filters.subject || undefined,
        topic: filters.topic || undefined,
        errorType: filters.errorType !== 'all' ? filters.errorType : undefined,
      });

      if (result.success && result.data) {
        // Save retest session to localStorage
        if (typeof window !== 'undefined') {
          const retestSession = {
            id: result.data.id,
            mode: result.data.mode,
            config: result.data.config,
            status: 'active',
            startedAt: result.data.createdAt,
            completedAt: null,
            questionIds: result.data.questionIds,
            attempts: [],
            currentIndex: 0,
            flaggedIds: [],
            bookmarkedIds: [],
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };

          const existing = localStorage.getItem('cfa-buddy-sessions');
          const sessionsArr = existing ? JSON.parse(existing) as SessionData[] : [];
          sessionsArr.push(retestSession as unknown as SessionData);
          localStorage.setItem('cfa-buddy-sessions', JSON.stringify(sessionsArr));
        }
      }
    } catch {
      // Silently handle errors
    } finally {
      setRetestLoading(false);
    }
  }, [filteredMistakes, filters]);

  const analyticsData = useMemo(
    () =>
      filteredMistakes.map((m) => ({
        classification: m.classification,
        timestamp: m.attempt.timestamp,
        questionId: m.attempt.questionId,
        confidence: m.attempt.confidence,
      })),
    [filteredMistakes]
  );

  const { visibleItems: paginatedMistakes, hasMore, loadMore } = useCursorPagination({
    items: filteredMistakes,
    pageSize: 20,
    getCursor: (item) => `${item.attempt.questionId}-${item.attempt.timestamp}`,
  });

  const { focusedIndex, listRef } = useListNavigation(paginatedMistakes.length);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-red-400">{mistakes.length}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Total Mistakes</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-orange-400">
            {mistakes.filter(m => m.attempt.confidence === 'Certain').length}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Misconceptions</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-yellow-400">
            {mistakes.filter(m => m.attempt.confidence === 'Guess').length}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Knowledge Gaps</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground-secondary)' }}>
            {classificationCounts['Unclassified'] ?? 0}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Unclassified</p>
        </div>
      </div>

      {/* Filter Bar */}
      <MistakeFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        availableTopics={availableTopics}
        filteredCount={filteredMistakes.length}
        onGenerateRetest={handleGenerateRetest}
        retestLoading={retestLoading}
      />

      {/* Analytics Charts */}
      <ErrorAnalytics mistakes={analyticsData} />

      {/* Mistake List */}
      <div ref={listRef} className="space-y-2">
        {paginatedMistakes.map((mistake, idx) => (
          <div
            key={idx}
            data-list-item
            className={`rounded-lg border p-4 transition-colors ${
              focusedIndex === idx ? 'ring-1 ring-[#C5A258]/50' : ''
            }`}
            style={{
              borderColor: focusedIndex === idx ? 'var(--accent-secondary)' : 'var(--card-border)',
              background: 'var(--card-bg)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>Question: {mistake.attempt.questionId}</p>
                {mistake.subject && (
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                    {mistake.subject}{mistake.topic ? ` / ${mistake.topic}` : ''}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    mistake.attempt.confidence === 'Certain' ? 'bg-red-900/30 text-red-400' :
                    mistake.attempt.confidence === 'ThinkSo' ? 'bg-orange-900/30 text-orange-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {mistake.attempt.confidence}
                  </span>
                  <span className="rounded px-2 py-0.5 text-[10px]" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
                    {mistake.classification}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                    {mistake.attempt.timeSpentSeconds}s
                  </span>
                </div>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                {new Date(mistake.attempt.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            Load More ({filteredMistakes.length - paginatedMistakes.length} remaining)
          </button>
        </div>
      )}

      {mistakes.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <p style={{ color: 'var(--foreground-secondary)' }}>No mistakes recorded yet.</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Complete some question sessions to see your error patterns.</p>
        </div>
      )}
    </div>
  );
}
