'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, BookOpen, Target, AlertTriangle, TrendingUp, Play } from 'lucide-react';
import { CFA_LEVEL1_WEIGHTINGS, MOCK_EXAM_CONFIG } from '../utils/exam-config';
import { getMockExamHistory } from '../utils/storage';
import { selectMockExamQuestions, getAllAvailableQuestions } from '../utils/question-selector';
import { saveExamProgress, getExamProgress } from '../utils/storage';
import type { ExamProgress, MockExamHistory } from '../types';

export function MockExamLanding() {
  const router = useRouter();
  const [history] = useState<MockExamHistory>(() => getMockExamHistory());
  const [existingProgress] = useState<ExamProgress | null>(() => getExamProgress());
  const [isStarting, setIsStarting] = useState(false);

  const availableCount = getAllAvailableQuestions().length;
  const examQuestionCount = Math.min(MOCK_EXAM_CONFIG.totalQuestions, availableCount);

  const startExam = useCallback(() => {
    setIsStarting(true);
    const questions = selectMockExamQuestions();
    const examId = `mock-${Date.now()}`;
    const now = new Date().toISOString();

    const progress: ExamProgress = {
      examId,
      startedAt: now,
      currentIndex: 0,
      answers: questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: null,
        flagged: false,
        timeSpentSeconds: 0,
      })),
      questionIds: questions.map((q) => q.id),
      timeRemainingSeconds: MOCK_EXAM_CONFIG.timeLimitMinutes * 60,
    };

    saveExamProgress(progress);
    router.push('/mock-exam/session');
  }, [router]);

  const resumeExam = useCallback(() => {
    router.push('/mock-exam/session');
  }, [router]);

  const lastExam = history.exams.length > 0
    ? history.exams[history.exams.length - 1]
    : null;

  const averageScore = history.exams.length > 0
    ? history.exams.reduce((sum, e) => sum + e.score, 0) / history.exams.length
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--foreground)' }}
        >
          Mock Exam
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          Full CFA Level I exam simulation
        </p>
      </div>

      {/* Resume In-Progress Exam */}
      {existingProgress && (
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card-bg)', borderColor: '#C5A258' }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" style={{ color: '#C5A258' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Exam In Progress
            </h2>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            You have an unfinished mock exam. Question {existingProgress.currentIndex + 1} of{' '}
            {existingProgress.questionIds.length}.
          </p>
          <button
            onClick={resumeExam}
            className="mt-4 rounded-lg px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#C5A258' }}
          >
            Resume Exam
          </button>
        </div>
      )}

      {/* Exam Rules */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h2
          className="mb-4 text-xl font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          Exam Rules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#C5A258' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                {examQuestionCount} Questions
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Multiple choice, 3 options each
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#C5A258' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                {MOCK_EXAM_CONFIG.timeLimitMinutes} Minutes
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                4 hours 30 minutes total
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#C5A258' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                {Math.round(MOCK_EXAM_CONFIG.passingThreshold * 100)}% to Pass
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Passing threshold
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#C5A258' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                No Breaks
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Timer runs continuously
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#C5A258' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                Realistic Weighting
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                CFA Institute curriculum weights
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Weightings Table */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h2
          className="mb-4 text-xl font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          Subject Weightings
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th
                  className="pb-3 text-left font-medium"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Subject
                </th>
                <th
                  className="pb-3 text-right font-medium"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Weight Range
                </th>
                <th
                  className="pb-3 text-right font-medium"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  ~Questions
                </th>
              </tr>
            </thead>
            <tbody>
              {CFA_LEVEL1_WEIGHTINGS.map((w) => (
                <tr
                  key={w.subject}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="py-2" style={{ color: 'var(--foreground)' }}>
                    {w.subject}
                  </td>
                  <td
                    className="py-2 text-right"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {w.minPercent}-{w.maxPercent}%
                  </td>
                  <td className="py-2 text-right" style={{ color: '#C5A258' }}>
                    {Math.round((w.targetPercent / 100) * examQuestionCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Summary */}
      {history.exams.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <h2
            className="mb-4 text-xl font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Previous Attempts
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#C5A258' }}>
                {history.exams.length}
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Exams Taken
              </p>
            </div>
            <div className="text-center">
              <p
                className="text-2xl font-bold"
                style={{ color: averageScore !== null && averageScore >= 0.7 ? '#00843D' : '#ef4444' }}
              >
                {averageScore !== null ? `${Math.round(averageScore * 100)}%` : '-'}
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Average Score
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {lastExam ? `${Math.round(lastExam.score * 100)}%` : '-'}
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Last Score
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={startExam}
          disabled={isStarting || availableCount === 0}
          className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#002B5C' }}
        >
          <Play className="h-5 w-5" />
          {isStarting ? 'Preparing Exam...' : 'Start Mock Exam'}
        </button>
        {availableCount === 0 && (
          <p className="mt-2 text-sm" style={{ color: '#ef4444' }}>
            No questions available. Import questions first.
          </p>
        )}
      </div>
    </div>
  );
}
