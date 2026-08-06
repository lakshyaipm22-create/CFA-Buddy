'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import type { Question } from '@/features/question-bank/types';
import type { ExamProgress } from '../types';
import { getExamProgress, saveExamProgress, clearExamProgress, saveMockExamResult } from '../utils/storage';
import { calculateExamScore } from '../utils/scoring';
import { getAllAvailableQuestions } from '../utils/question-selector';

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function MockExamSession() {
  const router = useRouter();
  const [progress, setProgress] = useState<ExamProgress | null>(() => getExamProgress());
  const [showNav, setShowNav] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(0);

  // Initialize the question start time via effect (not in render)
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, []);

  // Load questions from the bank matching the exam's question IDs
  const questions = useMemo<Question[]>(() => {
    if (!progress) return [];
    const all = getAllAvailableQuestions();
    const questionMap = new Map(all.map((q) => [q.id, q]));
    return progress.questionIds
      .map((id) => questionMap.get(id))
      .filter((q): q is Question => q !== undefined);
  }, [progress?.questionIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitExam = useCallback(() => {
    if (!progress) return;
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const updatedAnswers = [...progress.answers];
    updatedAnswers[progress.currentIndex] = {
      ...updatedAnswers[progress.currentIndex],
      timeSpentSeconds: updatedAnswers[progress.currentIndex].timeSpentSeconds + elapsed,
    };

    const completedAt = new Date().toISOString();
    const timeLimitSeconds = progress.timeRemainingSeconds + updatedAnswers.reduce(
      (sum, a) => sum + a.timeSpentSeconds, 0
    );

    const result = calculateExamScore(
      updatedAnswers,
      questions,
      progress.examId,
      progress.startedAt,
      completedAt,
      timeLimitSeconds
    );

    saveMockExamResult(result);
    clearExamProgress();
    router.push(`/mock-exam/results/${progress.examId}`);
  }, [progress, questions, router]);

  // Timer countdown
  useEffect(() => {
    if (!progress) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (!prev) return prev;
        const remaining = prev.timeRemainingSeconds - 1;
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...prev, timeRemainingSeconds: 0 };
        }
        return { ...prev, timeRemainingSeconds: remaining };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when time runs out
  useEffect(() => {
    if (progress && progress.timeRemainingSeconds <= 0) {
      submitExam();
    }
  }, [progress?.timeRemainingSeconds, submitExam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress periodically
  useEffect(() => {
    if (!progress) return;
    const interval = setInterval(() => {
      saveExamProgress(progress);
    }, 5000);
    return () => clearInterval(interval);
  }, [progress]);

  const recordTimeOnQuestion = useCallback(() => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    setProgress((prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[prev.currentIndex] = {
        ...answers[prev.currentIndex],
        timeSpentSeconds: answers[prev.currentIndex].timeSpentSeconds + elapsed,
      };
      return { ...prev, answers };
    });
    questionStartRef.current = Date.now();
  }, []);

  const selectAnswer = useCallback((label: string) => {
    setProgress((prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[prev.currentIndex] = {
        ...answers[prev.currentIndex],
        selectedAnswer: label,
      };
      const updated = { ...prev, answers };
      saveExamProgress(updated);
      return updated;
    });
  }, []);

  const toggleFlag = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[prev.currentIndex] = {
        ...answers[prev.currentIndex],
        flagged: !answers[prev.currentIndex].flagged,
      };
      const updated = { ...prev, answers };
      saveExamProgress(updated);
      return updated;
    });
  }, []);

  const goToQuestion = useCallback(
    (index: number) => {
      recordTimeOnQuestion();
      setProgress((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, currentIndex: index };
        saveExamProgress(updated);
        return updated;
      });
      setShowNav(false);
    },
    [recordTimeOnQuestion]
  );

  const goNext = useCallback(() => {
    if (!progress) return;
    if (progress.currentIndex < progress.questionIds.length - 1) {
      goToQuestion(progress.currentIndex + 1);
    }
  }, [progress, goToQuestion]);

  const goPrev = useCallback(() => {
    if (!progress) return;
    if (progress.currentIndex > 0) {
      goToQuestion(progress.currentIndex - 1);
    }
  }, [progress, goToQuestion]);

  // Redirect if no exam in progress
  if (!progress) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12" style={{ color: '#C5A258' }} />
        <p style={{ color: 'var(--foreground)' }}>No exam in progress.</p>
        <button
          onClick={() => router.push('/mock-exam')}
          className="rounded-lg px-6 py-2 font-medium text-white"
          style={{ background: '#002B5C' }}
        >
          Go to Mock Exam
        </button>
      </div>
    );
  }

  const currentQuestion = questions[progress.currentIndex];
  const currentAnswer = progress.answers[progress.currentIndex];
  const answeredCount = progress.answers.filter((a) => a.selectedAnswer !== null).length;
  const flaggedCount = progress.answers.filter((a) => a.flagged).length;
  const isLowTime = progress.timeRemainingSeconds < 600; // Less than 10 minutes

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Top Bar - Timer + Progress */}
      <div
        className="sticky top-0 z-10 mb-6 flex items-center justify-between rounded-xl border p-4"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-bold"
            style={{
              color: isLowTime ? '#ef4444' : 'var(--foreground)',
              background: isLowTime ? 'rgba(239, 68, 68, 0.1)' : undefined,
            }}
          >
            <Clock className="h-4 w-4" />
            {formatCountdown(progress.timeRemainingSeconds)}
          </div>
          <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            {answeredCount}/{progress.questionIds.length} answered
          </span>
          {flaggedCount > 0 && (
            <span className="text-sm" style={{ color: '#C5A258' }}>
              {flaggedCount} flagged
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNav(!showNav)}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            Q{progress.currentIndex + 1}/{progress.questionIds.length}
          </button>
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#00843D' }}
          >
            Submit
          </button>
        </div>
      </div>

      {/* Question Navigation Grid */}
      {showNav && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            Question Navigator
          </h3>
          <div className="grid grid-cols-10 gap-1 sm:grid-cols-15 md:grid-cols-20">
            {progress.answers.map((answer, idx) => {
              const isActive = idx === progress.currentIndex;
              const isAnswered = answer.selectedAnswer !== null;
              const isFlagged = answer.flagged;

              let bg = 'transparent';
              let border = 'var(--border)';
              let textColor = 'var(--foreground-secondary)';

              if (isActive) {
                bg = '#002B5C';
                textColor = '#ffffff';
                border = '#002B5C';
              } else if (isFlagged) {
                bg = 'rgba(197, 162, 88, 0.2)';
                border = '#C5A258';
                textColor = '#C5A258';
              } else if (isAnswered) {
                bg = 'rgba(0, 132, 61, 0.15)';
                border = '#00843D';
                textColor = '#00843D';
              }

              return (
                <button
                  key={idx}
                  onClick={() => goToQuestion(idx)}
                  className="flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded" style={{ background: 'rgba(0, 132, 61, 0.15)', border: '1px solid #00843D' }} />
              Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded" style={{ background: 'rgba(197, 162, 88, 0.2)', border: '1px solid #C5A258' }} />
              Flagged
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded" style={{ background: '#002B5C' }} />
              Current
            </span>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        {/* Question Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: '#C5A258' }}>
            Question {progress.currentIndex + 1} of {progress.questionIds.length}
          </span>
          <button
            onClick={toggleFlag}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
            style={{
              background: currentAnswer?.flagged ? 'rgba(197, 162, 88, 0.2)' : 'transparent',
              color: currentAnswer?.flagged ? '#C5A258' : 'var(--foreground-secondary)',
              border: `1px solid ${currentAnswer?.flagged ? '#C5A258' : 'var(--border)'}`,
            }}
          >
            <Flag className="h-4 w-4" />
            {currentAnswer?.flagged ? 'Flagged' : 'Flag'}
          </button>
        </div>

        {/* Subject Tag */}
        <div className="mb-3">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: 'rgba(0, 43, 92, 0.2)', color: '#C5A258' }}
          >
            {currentQuestion.subject}
          </span>
        </div>

        {/* Question Text */}
        <p
          className="mb-6 text-lg leading-relaxed"
          style={{ color: 'var(--foreground)' }}
        >
          {currentQuestion.questionText}
        </p>

        {/* Answer Choices */}
        <div className="space-y-3">
          {currentQuestion.answerChoices.map((choice) => {
            const isSelected = currentAnswer?.selectedAnswer === choice.label;
            return (
              <button
                key={choice.label}
                onClick={() => selectAnswer(choice.label)}
                className="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all"
                style={{
                  background: isSelected ? 'rgba(0, 43, 92, 0.15)' : 'transparent',
                  borderColor: isSelected ? '#002B5C' : 'var(--border)',
                }}
              >
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: isSelected ? '#002B5C' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--foreground)',
                    border: isSelected ? 'none' : '2px solid var(--border)',
                  }}
                >
                  {choice.label}
                </span>
                <span
                  className="pt-0.5 text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  {choice.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={progress.currentIndex === 0}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          onClick={goNext}
          disabled={progress.currentIndex === progress.questionIds.length - 1}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="mx-4 max-w-md rounded-xl border p-6"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Submit Exam?
            </h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              You have answered {answeredCount} of {progress.questionIds.length} questions.
              {progress.questionIds.length - answeredCount > 0 && (
                <span className="mt-1 block" style={{ color: '#ef4444' }}>
                  {progress.questionIds.length - answeredCount} questions are unanswered and will be marked incorrect.
                </span>
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Continue Exam
              </button>
              <button
                onClick={submitExam}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ background: '#00843D' }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
