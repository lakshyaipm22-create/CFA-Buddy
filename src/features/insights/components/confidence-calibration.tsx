'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import type { PracticeAttempt, AttemptQuestion } from '@/features/question-bank/types/attempt';
import type { Question, QuestionSession } from '@/features/question-bank/types';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { saveSession } from '@/features/question-bank/utils/session-storage';

interface ConfidenceCalibrationProps {
  attempts: PracticeAttempt[];
}

interface MatrixCell {
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

interface MisconceptionItem {
  questionId: string;
  questionText: string;
  subject: string;
  topic: string | null;
  selectedAnswer: string;
  correctAnswer: string;
}

export function ConfidenceCalibration({ attempts }: ConfidenceCalibrationProps) {
  const router = useRouter();
  const allQuestions = useMemo(() => loadAllQuestions(), []);

  // Build a map of questionId -> Question for quick lookup
  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of allQuestions) {
      map.set(q.id, q);
    }
    return map;
  }, [allQuestions]);

  // Collect all AttemptQuestion records from all attempts
  const allAttemptQuestions = useMemo(() => {
    const questions: AttemptQuestion[] = [];
    for (const attempt of attempts) {
      for (const moduleResult of attempt.moduleResults) {
        for (const qa of moduleResult.questionAttempts) {
          questions.push(qa);
        }
      }
    }
    return questions;
  }, [attempts]);

  // Compute the 2x3 confidence matrix
  const matrix = useMemo(() => {
    let mastered = 0;
    let solid = 0;
    let luckyGuess = 0;
    let misconception = 0;
    let weakArea = 0;
    let knowledgeGap = 0;

    for (const qa of allAttemptQuestions) {
      if (qa.correct) {
        if (qa.confidence === 'High') mastered++;
        else if (qa.confidence === 'Medium') solid++;
        else luckyGuess++;
      } else {
        if (qa.confidence === 'High') misconception++;
        else if (qa.confidence === 'Medium') weakArea++;
        else knowledgeGap++;
      }
    }

    return { mastered, solid, luckyGuess, misconception, weakArea, knowledgeGap };
  }, [allAttemptQuestions]);

  const total = allAttemptQuestions.length;

  // Build the misconception question list (wrong + High confidence)
  const misconceptions = useMemo((): MisconceptionItem[] => {
    const seen = new Set<string>();
    const items: MisconceptionItem[] = [];

    for (const qa of allAttemptQuestions) {
      if (!qa.correct && qa.confidence === 'High' && !seen.has(qa.questionId)) {
        seen.add(qa.questionId);
        const question = questionMap.get(qa.questionId);
        if (question) {
          const correctChoice = question.answerChoices.find(c => c.isCorrect);
          items.push({
            questionId: qa.questionId,
            questionText: question.questionText,
            subject: question.subject,
            topic: question.topic,
            selectedAnswer: qa.selectedAnswer,
            correctAnswer: correctChoice?.label ?? 'N/A',
          });
        }
      }
    }

    return items.slice(0, 20);
  }, [allAttemptQuestions, questionMap]);

  // Build the lucky guess list (correct + Low confidence)
  const luckyGuesses = useMemo((): MisconceptionItem[] => {
    const seen = new Set<string>();
    const items: MisconceptionItem[] = [];

    for (const qa of allAttemptQuestions) {
      if (qa.correct && qa.confidence === 'Low' && !seen.has(qa.questionId)) {
        seen.add(qa.questionId);
        const question = questionMap.get(qa.questionId);
        if (question) {
          const correctChoice = question.answerChoices.find(c => c.isCorrect);
          items.push({
            questionId: qa.questionId,
            questionText: question.questionText,
            subject: question.subject,
            topic: question.topic,
            selectedAnswer: qa.selectedAnswer,
            correctAnswer: correctChoice?.label ?? 'N/A',
          });
        }
      }
    }

    return items.slice(0, 20);
  }, [allAttemptQuestions, questionMap]);

  // Get all unique misconception question IDs for the Fix button
  const misconceptionIds = useMemo(() => {
    const seen = new Set<string>();
    for (const qa of allAttemptQuestions) {
      if (!qa.correct && qa.confidence === 'High') {
        seen.add(qa.questionId);
      }
    }
    return Array.from(seen);
  }, [allAttemptQuestions]);

  const handleFixMisconceptions = useCallback(() => {
    if (misconceptionIds.length === 0) return;

    const session: QuestionSession = {
      id: crypto.randomUUID(),
      mode: 'WeakTopic',
      config: { questionCount: misconceptionIds.length, timeLimit: null },
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionIds: misconceptionIds,
      attempts: [],
      currentIndex: 0,
      flaggedIds: [],
      bookmarkedIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    saveSession(session);
    router.push(`/questions/session/${session.id}`);
  }, [misconceptionIds, router]);

  if (total === 0) return null;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const matrixCells: MatrixCell[][] = [
    [
      {
        label: 'Mastered',
        count: matrix.mastered,
        percentage: pct(matrix.mastered),
        color: '#00843D',
        bgColor: 'rgba(0, 132, 61, 0.1)',
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      {
        label: 'Solid',
        count: matrix.solid,
        percentage: pct(matrix.solid),
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        label: 'Lucky Guess',
        count: matrix.luckyGuess,
        percentage: pct(matrix.luckyGuess),
        color: '#C5A258',
        bgColor: 'rgba(197, 162, 88, 0.1)',
        icon: <HelpCircle className="h-4 w-4" />,
      },
    ],
    [
      {
        label: 'Misconception',
        count: matrix.misconception,
        percentage: pct(matrix.misconception),
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: <ShieldAlert className="h-4 w-4" />,
      },
      {
        label: 'Weak Area',
        count: matrix.weakArea,
        percentage: pct(matrix.weakArea),
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        label: 'Knowledge Gap',
        count: matrix.knowledgeGap,
        percentage: pct(matrix.knowledgeGap),
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        icon: <XCircle className="h-4 w-4" />,
      },
    ],
  ];

  return (
    <div className="space-y-6">
      {/* Confidence Calibration Matrix */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Confidence Calibration Matrix
          </h3>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
          >
            {total} responses analyzed
          </span>
        </div>

        {/* Matrix Headers */}
        <div className="mb-2">
          <div className="grid grid-cols-4 gap-2 text-xs font-medium">
            <div />
            <div className="text-center" style={{ color: 'var(--foreground-secondary)' }}>
              High Confidence
            </div>
            <div className="text-center" style={{ color: 'var(--foreground-secondary)' }}>
              Medium Confidence
            </div>
            <div className="text-center" style={{ color: 'var(--foreground-secondary)' }}>
              Low Confidence
            </div>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="space-y-2">
          {/* Row labels */}
          {(['Correct', 'Incorrect'] as const).map((rowLabel, rowIdx) => (
            <div key={rowLabel} className="grid grid-cols-4 gap-2 items-center">
              <div
                className="text-xs font-medium text-right pr-2"
                style={{ color: rowIdx === 0 ? '#00843D' : '#ef4444' }}
              >
                {rowLabel}
              </div>
              {matrixCells[rowIdx].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-lg p-3 text-center border transition-all hover:scale-[1.02]"
                  style={{
                    background: cell.bgColor,
                    borderColor: `${cell.color}33`,
                  }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1" style={{ color: cell.color }}>
                    {cell.icon}
                    <span className="text-[10px] font-medium">{cell.label}</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: cell.color }}>
                    {cell.count}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                    {cell.percentage}%
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Calibration Score */}
        <div
          className="mt-4 pt-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div>
            <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Calibration Score:
            </span>
            <span className="ml-2 text-sm font-bold" style={{ color: '#C5A258' }}>
              {total > 0
                ? Math.round(
                    ((matrix.mastered + matrix.knowledgeGap) / total) * 100
                  )
                : 0}
              %
            </span>
            <span className="ml-2 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
              (How well your confidence matches reality)
            </span>
          </div>
          {misconceptionIds.length > 0 && (
            <button
              onClick={handleFixMisconceptions}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              <Zap className="h-4 w-4" />
              Fix {misconceptionIds.length} Misconception{misconceptionIds.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Top Misconceptions Section */}
      {misconceptions.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'var(--card-bg)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5" style={{ color: '#ef4444' }} />
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--foreground)' }}
            >
              Top Misconceptions
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
            >
              High Priority
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            You answered these wrong with high confidence. These are your most dangerous blind spots on exam day.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {misconceptions.map((item, idx) => (
              <div
                key={item.questionId}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--card-border)', background: 'rgba(239, 68, 68, 0.03)' }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs leading-relaxed line-clamp-2"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {item.questionText}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0, 43, 92, 0.15)', color: '#7da5d4' }}
                      >
                        {item.subject}
                      </span>
                      {item.topic && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
                        >
                          {item.topic}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: '#ef4444' }}>
                        You chose: {item.selectedAnswer}
                      </span>
                      <span className="text-[10px]" style={{ color: '#00843D' }}>
                        Correct: {item.correctAnswer}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lucky Guesses Warning */}
      {luckyGuesses.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'rgba(197, 162, 88, 0.3)', background: 'var(--card-bg)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5" style={{ color: '#C5A258' }} />
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--foreground)' }}
            >
              Lucky Guesses
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
            >
              Needs Reinforcement
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            You got these right but with low confidence. These topics need reinforcement so you can rely on them under exam pressure.
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {luckyGuesses.map((item, idx) => (
              <div
                key={item.questionId}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--card-border)', background: 'rgba(197, 162, 88, 0.03)' }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs leading-relaxed line-clamp-2"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {item.questionText}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0, 43, 92, 0.15)', color: '#7da5d4' }}
                      >
                        {item.subject}
                      </span>
                      {item.topic && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
                        >
                          {item.topic}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
