'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, Clock, BookOpen, Zap, Target, TrendingUp } from 'lucide-react';
import { loadAllQuestions } from '../utils/question-loader';
import { computeStudyRecommendation, getQuickRecommendations } from '../utils/session-recommender';
import type { StudyRecommendation, QuickOption } from '../utils/session-recommender';
import type { PracticeAttempt } from '../types/attempt';

const ATTEMPTS_KEY = 'cfa-buddy-attempts';
const SMART_SESSION_KEY = 'cfa-buddy-smart-session';

function getAllAttempts(): PracticeAttempt[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'rgba(0, 132, 61, 0.15)', text: '#00843D' },
  Medium: { bg: 'rgba(197, 162, 88, 0.15)', text: '#C5A258' },
  Hard: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  Mixed: { bg: 'rgba(0, 43, 92, 0.15)', text: '#5b9bd5' },
};

const quickOptionIcons = [
  <Zap key="zap" className="h-4 w-4" />,
  <Target key="target" className="h-4 w-4" />,
  <TrendingUp key="trending" className="h-4 w-4" />,
];

export function SmartSessionCard() {
  const router = useRouter();
  const pathname = usePathname();
  const [attempts] = useState<PracticeAttempt[]>(() => getAllAttempts());
  const questions = useMemo(() => loadAllQuestions(), []);

  const recommendation: StudyRecommendation = useMemo(
    () => computeStudyRecommendation(attempts, questions),
    [attempts, questions]
  );

  const quickOptions: [QuickOption, QuickOption, QuickOption] = useMemo(
    () => getQuickRecommendations(attempts, questions),
    [attempts, questions]
  );

  function handleStartSmartSession() {
    sessionStorage.setItem(
      SMART_SESSION_KEY,
      JSON.stringify({
        subject: recommendation.recommendedModule,
        difficulty: recommendation.recommendedDifficulty,
        questionCount: recommendation.recommendedQuestionCount,
      })
    );
    // If already on /questions, a soft navigation won't remount the page,
    // so force a full page reload to pick up the new session config.
    if (pathname === '/questions') {
      window.location.reload();
    } else {
      router.push('/questions');
    }
  }

  function handleStartQuickOption(option: QuickOption) {
    sessionStorage.setItem(
      SMART_SESSION_KEY,
      JSON.stringify({
        subject: option.module,
        difficulty: option.difficulty === 'Mixed' ? undefined : option.difficulty,
        questionCount: option.questionCount,
      })
    );
    if (pathname === '/questions') {
      window.location.reload();
    } else {
      router.push('/questions');
    }
  }

  const diffColor = difficultyColors[recommendation.recommendedDifficulty] ?? difficultyColors.Medium;

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Smart Next Session
        </h2>
      </div>

      {/* Primary Recommendation */}
      <div
        className="rounded-lg border p-4 space-y-3"
        style={{
          borderColor: 'var(--accent-primary)',
          background: 'rgba(197, 162, 88, 0.03)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {recommendation.recommendedModule}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: diffColor.bg, color: diffColor.text }}
          >
            {recommendation.recommendedDifficulty}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {recommendation.recommendedQuestionCount} questions
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{recommendation.estimatedMinutes} min
          </span>
        </div>

        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {recommendation.reasoning}
        </p>

        <button
          onClick={handleStartSmartSession}
          className="mt-1 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
        >
          <Sparkles className="h-4 w-4" />
          Start Smart Session
        </button>
      </div>

      {/* Quick Options */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickOptions.map((option, idx) => {
          const optDiffColor = difficultyColors[option.difficulty] ?? difficultyColors.Mixed;
          return (
            <div
              key={option.title}
              className="rounded-lg border p-3 space-y-2 transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--accent-primary)' }}>{quickOptionIcons[idx]}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {option.title}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {option.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: optDiffColor.bg, color: optDiffColor.text }}
                >
                  {option.difficulty}
                </span>
                <span>{option.questionCount} Qs</span>
                <span>~{option.estimatedMinutes} min</span>
              </div>
              <button
                onClick={() => handleStartQuickOption(option)}
                className="mt-1 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--card-border)', color: 'var(--foreground)' }}
              >
                Start
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
