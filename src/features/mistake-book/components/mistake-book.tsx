'use client';

import { useState, useMemo, useCallback } from 'react';
import type { QuestionAttempt } from '@/features/question-bank/types';
import { ErrorAnalytics } from './error-analytics';
import { MistakeFilterBar, type MistakeFilters } from './mistake-filter-bar';
import { generateRetest } from '../actions/retest';
import { useListNavigation } from '@/shared/hooks/use-list-navigation';

interface EnrichedMistake {
  questionId: string;
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

  // Read PracticeAttempts and Questions via lazy initializers (no useSyncExternalStore)
  const [attempts] = useState(() => getAllAttempts());
  const [questions] = useState(() => loadAllQuestions());

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

    return result;
  }, [attempts, questionMap]);

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

  const availableTopics = useMemo(() => {
    const filtered = subjectFilter === 'All'
      ? enrichedMistakes
      : enrichedMistakes.filter(m => m.subject === subjectFilter);
    const topics = new Set(filtered.map(m => m.topic).filter(Boolean) as string[]);
    return Array.from(topics).sort();
  }, [enrichedMistakes, subjectFilter]);

  // Apply filters
  const filteredMistakes = useMemo(() => {
    let result = enrichedMistakes;

    if (subjectFilter !== 'All') {
      result = result.filter(m => m.subject === subjectFilter);
    }

    if (confidenceFilter !== 'All') {
      result = result.filter(m => m.confidence === confidenceFilter);
    }

    if (topicFilter !== 'All') {
      result = result.filter(m => m.topic === topicFilter);
    }

    // Apply sorting
    const sorted = [...result];
    switch (sortMode) {
      case 'confidence':
        sorted.sort((a, b) => {
          const order = { High: 0, Medium: 1, Low: 2 };
          return order[a.confidence] - order[b.confidence];
        });
        break;
      case 'time':
        sorted.sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds);
        break;
      case 'subject':
        sorted.sort((a, b) => a.subject.localeCompare(b.subject));
        break;
    }

    return sorted;
  }, [enrichedMistakes, subjectFilter, confidenceFilter, topicFilter, sortMode]);

  // Build data for MistakeAnalytics (expects { attempt: QuestionAttempt, classification: string }[])
  const analyticsData = useMemo(() => {
    return enrichedMistakes.map((m): { attempt: QuestionAttempt; classification: string } => ({
      attempt: {
        questionId: m.questionId,
        selectedAnswer: m.selectedAnswer,
        confidence: mapConfidenceToAnalytics(m.confidence),
        timeSpentSeconds: m.timeSpentSeconds,
        correct: false,
        errorClassification: m.errorClassification as QuestionAttempt['errorClassification'],
        timestamp: new Date().toISOString(),
      },
      classification: m.errorClassification,
    }));
  }, [enrichedMistakes]);

  // Memoize unique question count for the retry button badge
  const filteredUniqueQuestionCount = useMemo(
    () => new Set(filteredMistakes.map(m => m.questionId)).size,
    [filteredMistakes]
  );

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

  const { focusedIndex, listRef } = useListNavigation(filteredMistakes.length);

  // Retry Mistakes handler - creates a session with unique incorrect question IDs
  const handleRetryMistakes = useCallback(() => {
    const uniqueIds = Array.from(new Set(filteredMistakes.map(m => m.questionId)));
    if (uniqueIds.length === 0) return;

    const session: QuestionSession = {
      id: crypto.randomUUID(),
      mode: 'AdaptiveRetest',
      config: { questionCount: uniqueIds.length, timeLimit: null },
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionIds: uniqueIds,
      attempts: [],
      currentIndex: 0,
      flaggedIds: [],
      bookmarkedIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    saveSession(session);
    router.push(`/questions/session/${session.id}`);
  }, [filteredMistakes, router]);

  // Stats
  const misconceptionCount = enrichedMistakes.filter(m => m.confidence === 'High').length;
  const knowledgeGapCount = enrichedMistakes.filter(m => m.confidence === 'Low').length;
  const uniqueQuestionCount = new Set(enrichedMistakes.map(m => m.questionId)).size;

  // Reset topic filter when subject changes
  const handleSubjectChange = useCallback((value: string) => {
    setSubjectFilter(value);
    setTopicFilter('All');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Retry Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Mistake Book
          </h2>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {enrichedMistakes.length} total errors across {uniqueQuestionCount} unique questions
          </p>
        </div>
        {filteredMistakes.length > 0 && (
          <button
            onClick={handleRetryMistakes}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: '#00843D', color: '#ffffff' }}
          >
            Retry Mistakes ({filteredUniqueQuestionCount})
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-red-400">{enrichedMistakes.length}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Total Mistakes</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-orange-400">{misconceptionCount}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Misconceptions</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-yellow-400">{knowledgeGapCount}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Knowledge Gaps</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold" style={{ color: '#C5A258' }}>{uniqueQuestionCount}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Unique Questions</p>
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
      <div ref={listRef} className="space-y-3">
        {filteredMistakes.map((mistake, idx) => (
          <div
            key={`${mistake.attemptId}-${mistake.questionId}-${idx}`}
            data-list-item
            className={`rounded-lg border transition-colors ${
              focusedIndex === idx ? 'ring-1 ring-[#C5A258]/50' : ''
            }`}
            style={{
              borderColor: mistake.confidence === 'High'
                ? '#dc2626'
                : focusedIndex === idx
                  ? 'var(--accent-secondary)'
                  : 'var(--card-border)',
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
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {expandedIndex === idx ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Expanded Detail */}
            {expandedIndex === idx && (
              <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--card-border)' }}>
                {/* What user selected */}
                <div className="mb-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-red-400">Your Answer</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--foreground)' }}>
                    {mistake.selectedAnswer}
                  </p>
                </div>
                {/* Correct answer */}
                <div className="mb-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-green-400">Correct Answer</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--foreground)' }}>
                    <span className="font-semibold">{mistake.correctAnswer.label}.</span> {mistake.correctAnswer.text}
                  </p>
                </div>
                {/* Explanation */}
                {mistake.correctAnswer.explanation && (
                  <div className="rounded-md p-3" style={{ background: 'rgba(0, 132, 61, 0.1)', border: '1px solid rgba(0, 132, 61, 0.2)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-green-400 mb-1">Explanation</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                      {mistake.correctAnswer.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {enrichedMistakes.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <p style={{ color: 'var(--foreground-secondary)' }}>No mistakes recorded yet.</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Complete some practice sessions to see your error patterns and get targeted review.
          </p>
        </div>
      )}

      {/* Filtered empty state */}
      {enrichedMistakes.length > 0 && filteredMistakes.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <p style={{ color: 'var(--foreground-secondary)' }}>No mistakes match the current filters.</p>
          <button
            onClick={() => { setSubjectFilter('All'); setConfidenceFilter('All'); setTopicFilter('All'); }}
            className="mt-2 text-xs underline"
            style={{ color: '#C5A258' }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
