'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronUp, BookOpen, Zap } from 'lucide-react';
import { identifyWeakestTopics, getWeakTopicQuestionDetails, generateMiniQuiz } from '../utils/weak-topics';
import type { PracticeAttempt } from '../types/attempt';
import type { Question } from '../types/index';
import type { WeakTopic } from '../utils/weak-topics';

interface WeakTopicPanelProps {
  attempts: PracticeAttempt[];
  questions: Question[];
}

export function WeakTopicPanel({ attempts, questions }: WeakTopicPanelProps) {
  const weakTopics = useMemo(
    () => identifyWeakestTopics(attempts, questions, 3),
    [attempts, questions]
  );

  if (weakTopics.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <BookOpen className="mx-auto h-10 w-10 opacity-30" style={{ color: 'var(--foreground-secondary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Complete more practice attempts to identify weak topics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" style={{ color: 'var(--accent-secondary)' }} />
        <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Weakest Topics
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {weakTopics.map(topic => (
          <WeakTopicCard
            key={topic.topic}
            weakTopic={topic}
            attempts={attempts}
            questions={questions}
          />
        ))}
      </div>
    </div>
  );
}

function WeakTopicCard({
  weakTopic,
  attempts,
  questions,
}: {
  weakTopic: WeakTopic;
  attempts: PracticeAttempt[];
  questions: Question[];
}) {
  const [expanded, setExpanded] = useState(false);

  const missedQuestions = useMemo(
    () => (expanded ? getWeakTopicQuestionDetails(weakTopic.topic, attempts, questions) : []),
    [expanded, weakTopic.topic, attempts, questions]
  );

  const accuracyColor =
    weakTopic.accuracy < 40 ? '#ef4444' : weakTopic.accuracy < 60 ? 'var(--accent-secondary)' : 'var(--foreground)';

  const handleFocusQuiz = () => {
    const quiz = generateMiniQuiz(weakTopic.topic, questions, 5, attempts);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'cfa-buddy-focus-quiz',
        JSON.stringify({
          topic: weakTopic.topic,
          questionIds: quiz.map(q => q.id),
          count: quiz.length,
        })
      );
    }
  };

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
            {weakTopic.topic}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {weakTopic.incorrectQuestionIds.length} questions missed
          </p>
        </div>
        <span className="text-lg font-bold ml-2" style={{ color: accuracyColor }}>
          {weakTopic.accuracy}%
        </span>
      </div>

      {/* Accuracy bar */}
      <div className="h-2 w-full rounded-full mb-3" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${weakTopic.accuracy}%`,
            backgroundColor: accuracyColor,
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--nav-hover-bg)',
            color: 'var(--foreground-secondary)',
          }}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Details'}
        </button>
        <Link
          href={`/practice?subject=${encodeURIComponent(weakTopic.topic)}&topic=${encodeURIComponent(weakTopic.topic)}`}
          onClick={handleFocusQuiz}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'rgba(197, 162, 88, 0.15)',
            color: 'var(--accent-secondary)',
          }}
        >
          <Zap className="h-3 w-3" />
          Focus Quiz
        </Link>
      </div>

      {/* Expanded detail */}
      {expanded && missedQuestions.length > 0 && (
        <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
          {missedQuestions.slice(0, 5).map(q => {
            const correctChoice = q.answerChoices.find(c => c.isCorrect);
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                  {q.questionText.length > 150 ? q.questionText.slice(0, 150) + '...' : q.questionText}
                </p>
                {correctChoice && (
                  <p className="text-xs" style={{ color: 'var(--accent-success)' }}>
                    Correct: {correctChoice.label}. {correctChoice.explanation.length > 100
                      ? correctChoice.explanation.slice(0, 100) + '...'
                      : correctChoice.explanation}
                  </p>
                )}
              </div>
            );
          })}
          {missedQuestions.length > 5 && (
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              + {missedQuestions.length - 5} more questions
            </p>
          )}
        </div>
      )}
    </div>
  );
}
