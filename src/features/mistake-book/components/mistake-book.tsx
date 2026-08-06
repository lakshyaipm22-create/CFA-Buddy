'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionAttempt } from '@/features/question-bank/types';
import type { Question, QuestionSession } from '@/features/question-bank/types';
import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { saveSession } from '@/features/question-bank/utils/session-storage';
import { MistakeAnalytics } from './mistake-analytics';
import { useListNavigation } from '@/shared/hooks/use-list-navigation';

interface EnrichedMistake {
  questionId: string;
  questionText: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  confidence: 'High' | 'Medium' | 'Low';
  selectedAnswer: string;
  correctAnswer: { label: string; text: string; explanation: string };
  timeSpentSeconds: number;
  errorClassification: string;
  attemptId: string;
}

type SortMode = 'confidence' | 'time' | 'subject';
type ConfidenceFilter = 'All' | 'High' | 'Medium' | 'Low';

/**
 * Map PracticeAttempt confidence levels to QuestionAttempt confidence levels
 * for MistakeAnalytics compatibility.
 * High -> Certain (misconceptions), Medium -> ThinkSo, Low -> Guess
 */
function mapConfidenceToAnalytics(confidence: 'High' | 'Medium' | 'Low'): 'Guess' | 'ThinkSo' | 'Certain' {
  switch (confidence) {
    case 'High': return 'Certain';
    case 'Medium': return 'ThinkSo';
    case 'Low': return 'Guess';
  }
}

export function MistakeBook() {
  const router = useRouter();

  // Read PracticeAttempts and Questions via lazy initializers (no useSyncExternalStore)
  const [attempts] = useState(() => getAllAttempts());
  const [questions] = useState(() => loadAllQuestions());

  // Filters and sorting state
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('confidence');
  const [expandedIndex, setExpandedIndex] = useState<number>(-1);

  // Build question lookup map
  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  // Build enriched mistake entries from all incorrect AttemptQuestion records
  const enrichedMistakes = useMemo<EnrichedMistake[]>(() => {
    const result: EnrichedMistake[] = [];

    for (const attempt of attempts) {
      for (const moduleResult of attempt.moduleResults) {
        for (const qa of moduleResult.questionAttempts) {
          if (!qa.correct) {
            const question = questionMap.get(qa.questionId);
            if (!question) continue;

            const correctChoice = question.answerChoices.find(c => c.isCorrect);

            result.push({
              questionId: qa.questionId,
              questionText: question.questionText,
              subject: question.subject,
              topic: question.topic,
              difficulty: question.difficulty,
              confidence: qa.confidence,
              selectedAnswer: qa.selectedAnswer,
              correctAnswer: correctChoice
                ? { label: correctChoice.label, text: correctChoice.text, explanation: correctChoice.explanation }
                : { label: '?', text: 'Unknown', explanation: '' },
              timeSpentSeconds: qa.timeSpentSeconds,
              errorClassification: qa.errorClassification ?? 'Unclassified',
              attemptId: attempt.id,
            });
          }
        }
      }
    }

    return result;
  }, [attempts, questionMap]);

  // Derive available subjects and topics from mistakes
  const availableSubjects = useMemo(() => {
    const subjects = new Set(enrichedMistakes.map(m => m.subject));
    return Array.from(subjects).sort();
  }, [enrichedMistakes]);

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

      {/* Analytics Charts */}
      <MistakeAnalytics mistakes={analyticsData} />

      {/* Filters and Sorting */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Subject Filter */}
        <select
          value={subjectFilter}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-xs"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="All">All Subjects</option>
          {availableSubjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Topic Filter */}
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-xs"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="All">All Topics</option>
          {availableTopics.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Confidence Filter */}
        <div className="flex gap-1">
          {(['All', 'High', 'Medium', 'Low'] as const).map(level => (
            <button
              key={level}
              onClick={() => setConfidenceFilter(level)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={confidenceFilter === level
                ? { background: level === 'High' ? '#dc2626' : level === 'Medium' ? '#d97706' : level === 'Low' ? '#6b7280' : 'var(--accent-primary)', color: '#ffffff' }
                : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
              }
            >
              {level === 'All' ? 'All' : level === 'High' ? 'Misconceptions' : level === 'Medium' ? 'Weak Areas' : 'Gaps'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-md border px-3 py-1.5 text-xs"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="confidence">Sort: Misconceptions First</option>
          <option value="time">Sort: Slowest First</option>
          <option value="subject">Sort: By Subject</option>
        </select>
      </div>

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
            {/* Card Header - always visible */}
            <button
              onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug line-clamp-2" style={{ color: 'var(--foreground)' }}>
                    {mistake.questionText}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Subject Badge */}
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: '#002B5C', color: '#C5A258' }}
                    >
                      {mistake.subject}
                    </span>
                    {/* Topic Badge */}
                    {mistake.topic && (
                      <span
                        className="rounded px-2 py-0.5 text-[10px]"
                        style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
                      >
                        {mistake.topic}
                      </span>
                    )}
                    {/* Confidence Indicator */}
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      mistake.confidence === 'High' ? 'bg-red-900/30 text-red-400' :
                      mistake.confidence === 'Medium' ? 'bg-orange-900/30 text-orange-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {mistake.confidence === 'High' ? 'Misconception' : mistake.confidence === 'Medium' ? 'Weak Area' : 'Knowledge Gap'}
                    </span>
                    {/* Error Classification */}
                    <span className="rounded px-2 py-0.5 text-[10px]" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
                      {mistake.errorClassification.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {/* Time Spent */}
                    <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                      {mistake.timeSpentSeconds}s
                    </span>
                    {/* Difficulty */}
                    <span className={`text-[10px] font-medium ${
                      mistake.difficulty === 'Hard' ? 'text-red-400' :
                      mistake.difficulty === 'Medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {mistake.difficulty}
                    </span>
                  </div>
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
