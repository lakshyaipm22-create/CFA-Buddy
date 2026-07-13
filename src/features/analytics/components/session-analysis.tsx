'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle,
  Star, Flag, Filter, Download, Share2, RotateCcw, Brain,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { getSession, getSessions } from '@/features/question-bank/utils/session-storage';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { buildConfidenceMatrix, classifyAttempt } from '@/features/question-bank/utils/confidence-matrix';
import { BatchFlashcardCreator } from '@/features/flashcards/components/batch-flashcard-creator';
import type { QuestionSession, Question, ConfidenceMatrix } from '@/features/question-bank/types';
import { formatDuration, formatDateRange } from '../utils/time-utils';

// Lazy-load Recharts components (no SSR)
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(m => m.ReferenceLine), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });

type QuestionFilter = 'all' | 'wrong' | 'flagged' | 'slow' | 'misconceptions';
type QuestionSort = 'number' | 'time' | 'confidence';

interface SessionAnalysisProps {
  sessionId: string;
}

interface SubjectRow {
  subject: string;
  questions: number;
  correct: number;
  accuracy: number;
  avgTime: number;
  certainCount: number;
  thinkSoCount: number;
  guessCount: number;
}

export function SessionAnalysis({ sessionId }: SessionAnalysisProps) {
  // Load session data using lazy initializer (never useSyncExternalStore for one-time reads)
  const [session] = useState<QuestionSession | null>(() => {
    if (typeof window === 'undefined') return null;
    return getSession(sessionId);
  });

  const [allSessions] = useState<QuestionSession[]>(() => {
    if (typeof window === 'undefined') return [];
    return getSessions().filter(s => s.status === 'completed');
  });

  const [questions] = useState<Question[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadAllQuestions();
  });

  const [activeFilter, setActiveFilter] = useState<QuestionFilter>('all');
  const [activeSort, setActiveSort] = useState<QuestionSort>('number');
  const [matrixFilter, setMatrixFilter] = useState<keyof ConfidenceMatrix | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showFlashcardCreator, setShowFlashcardCreator] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  // Build a question map for quick lookup
  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) map.set(q.id, q);
    return map;
  }, [questions]);

  // Compute session analysis data
  const analysis = useMemo(() => {
    if (!session) return null;
    const attempts = session.attempts ?? [];
    const totalQuestions = attempts.length;
    const correctAnswers = attempts.filter(a => a.correct).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passingThreshold = 72;
    const passed = accuracy >= passingThreshold;

    // Duration
    let durationSeconds = 0;
    if (session.startedAt && session.completedAt) {
      durationSeconds = Math.max(0, Math.floor(
        (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      ));
    } else {
      durationSeconds = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds ?? 0), 0);
    }
    const avgTimePerQuestion = totalQuestions > 0 ? durationSeconds / totalQuestions : 0;

    // Confidence matrix
    const matrix = buildConfidenceMatrix(attempts);

    // Time analysis
    const times = attempts.map(a => a.timeSpentSeconds);
    const sortedTimes = [...times].sort((a, b) => a - b);
    const fastestTime = sortedTimes[0] ?? 0;
    const slowestTime = sortedTimes[sortedTimes.length - 1] ?? 0;
    const medianTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;
    const avgTimeLine = totalQuestions > 0
      ? times.reduce((s, t) => s + t, 0) / totalQuestions
      : 0;
    const timeTraps = attempts.filter(a => a.timeSpentSeconds > 90);
    const timeTrapSeconds = timeTraps.reduce((s, a) => s + a.timeSpentSeconds, 0);

    // Find fastest/slowest question indices
    let fastestIdx = 0;
    let slowestIdx = 0;
    for (let i = 0; i < times.length; i++) {
      if (times[i] < times[fastestIdx]) fastestIdx = i;
      if (times[i] > times[slowestIdx]) slowestIdx = i;
    }

    // Subject breakdown
    const subjectMap: Record<string, { correct: number; total: number; time: number; certain: number; thinkSo: number; guess: number }> = {};
    for (const attempt of attempts) {
      const q = questionMap.get(attempt.questionId);
      const subject = q?.subject ?? 'Unknown';
      if (!subjectMap[subject]) subjectMap[subject] = { correct: 0, total: 0, time: 0, certain: 0, thinkSo: 0, guess: 0 };
      subjectMap[subject].total++;
      subjectMap[subject].time += attempt.timeSpentSeconds;
      if (attempt.correct) subjectMap[subject].correct++;
      if (attempt.confidence === 'Certain') subjectMap[subject].certain++;
      else if (attempt.confidence === 'ThinkSo') subjectMap[subject].thinkSo++;
      else subjectMap[subject].guess++;
    }

    const subjectRows: SubjectRow[] = Object.entries(subjectMap)
      .map(([subject, data]) => ({
        subject,
        questions: data.total,
        correct: data.correct,
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        avgTime: data.total > 0 ? data.time / data.total : 0,
        certainCount: data.certain,
        thinkSoCount: data.thinkSo,
        guessCount: data.guess,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Worst first

    // Compute personal average from all sessions
    const otherSessions = allSessions.filter(s => s.id !== session.id);
    let avgAccuracy = 0;
    let avgTimePerQ = 0;
    let avgGuessRate = 0;
    let avgMisconceptionRate = 0;
    if (otherSessions.length > 0) {
      let totalQ = 0, totalC = 0, totalTime = 0, totalGuess = 0, totalMisconception = 0;
      for (const s of otherSessions) {
        const att = s.attempts ?? [];
        totalQ += att.length;
        totalC += att.filter(a => a.correct).length;
        totalTime += att.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
        totalGuess += att.filter(a => a.confidence === 'Guess').length;
        totalMisconception += att.filter(a => !a.correct && a.confidence === 'Certain').length;
      }
      avgAccuracy = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
      avgTimePerQ = totalQ > 0 ? totalTime / totalQ : 0;
      avgGuessRate = totalQ > 0 ? (totalGuess / totalQ) * 100 : 0;
      avgMisconceptionRate = totalQ > 0 ? (totalMisconception / totalQ) * 100 : 0;
    }

    const thisGuessRate = totalQuestions > 0
      ? (attempts.filter(a => a.confidence === 'Guess').length / totalQuestions) * 100
      : 0;
    const thisMisconceptionRate = totalQuestions > 0
      ? (matrix.misconception / totalQuestions) * 100
      : 0;

    // Last 10 sessions trend
    const last10 = allSessions
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .slice(-10)
      .map(s => {
        const att = s.attempts ?? [];
        const total = att.length;
        const correct = att.filter(a => a.correct).length;
        return {
          id: s.id,
          accuracy: total > 0 ? (correct / total) * 100 : 0,
          date: new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          isCurrent: s.id === session.id,
        };
      });

    // Wrong questions for flashcard creation
    const wrongAttempts = attempts.filter(a => !a.correct);
    const wrongQuestions = wrongAttempts
      .map(a => questionMap.get(a.questionId))
      .filter((q): q is Question => q !== undefined);

    return {
      totalQuestions,
      correctAnswers,
      accuracy,
      passed,
      durationSeconds,
      avgTimePerQuestion,
      matrix,
      times,
      fastestTime,
      slowestTime,
      medianTime,
      avgTimeLine,
      fastestIdx,
      slowestIdx,
      timeTraps,
      timeTrapSeconds,
      subjectRows,
      avgAccuracy,
      avgTimePerQ,
      avgGuessRate,
      avgMisconceptionRate,
      thisGuessRate,
      thisMisconceptionRate,
      last10,
      wrongQuestions,
      attempts,
    };
  }, [session, allSessions, questionMap]);

  // Filter and sort questions
  const filteredAttempts = useMemo(() => {
    if (!session || !analysis) return [];
    let attempts = analysis.attempts.map((a, idx) => ({ ...a, index: idx }));

    // Apply matrix filter first
    if (matrixFilter) {
      attempts = attempts.filter(a => classifyAttempt(a) === matrixFilter);
    }

    // Apply regular filter
    switch (activeFilter) {
      case 'wrong':
        attempts = attempts.filter(a => !a.correct);
        break;
      case 'flagged':
        attempts = attempts.filter(a => session.flaggedIds?.includes(a.questionId));
        break;
      case 'slow':
        attempts = attempts.filter(a => a.timeSpentSeconds > 90);
        break;
      case 'misconceptions':
        attempts = attempts.filter(a => !a.correct && a.confidence === 'Certain');
        break;
    }

    // Sort
    switch (activeSort) {
      case 'number':
        attempts.sort((a, b) => a.index - b.index);
        break;
      case 'time':
        attempts.sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds);
        break;
      case 'confidence':
        {
          const confOrder = { Certain: 0, ThinkSo: 1, Guess: 2 };
          attempts.sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence]);
        }
        break;
    }

    return attempts;
  }, [session, analysis, activeFilter, activeSort, matrixFilter]);

  const toggleExpand = useCallback((idx: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!session || !analysis) return;
    const attempts = session.attempts ?? [];
    const headers = ['Question #', 'Question Text', 'Your Answer', 'Correct Answer', 'Correct', 'Confidence', 'Time (s)', 'Subject', 'Topic'];
    const rows = attempts.map((a, idx) => {
      const q = questionMap.get(a.questionId);
      const correctChoice = q?.answerChoices.find(c => c.isCorrect);
      return [
        idx + 1,
        `"${(q?.questionText ?? '').replace(/"/g, '""').slice(0, 200)}"`,
        a.selectedAnswer,
        correctChoice?.label ?? '',
        a.correct ? 'Yes' : 'No',
        a.confidence,
        a.timeSpentSeconds,
        q?.subject ?? '',
        q?.topic ?? '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cfa-buddy-session-${session.id.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [session, analysis, questionMap]);

  const handleShareScore = useCallback(() => {
    if (!session || !analysis) return;
    const modeLabel = MODE_LABELS[session.mode] ?? session.mode;
    const text = [
      `CFA Buddy - ${modeLabel}`,
      `Score: ${analysis.correctAnswers}/${analysis.totalQuestions} (${analysis.accuracy.toFixed(1)}%)`,
      `${analysis.passed ? 'PASS' : 'Needs Improvement'} (72% threshold)`,
      `Time: ${formatDuration(analysis.durationSeconds)}`,
      `Avg per question: ${analysis.avgTimePerQuestion.toFixed(1)}s`,
      '',
      'cfa-buddy.vercel.app',
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setShareMessage('Copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000);
    });
  }, [session, analysis]);

  // Error state
  if (!session) {
    return (
      <div className="space-y-6">
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analytics
        </Link>
        <div
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <AlertTriangle className="mx-auto h-12 w-12 opacity-30" style={{ color: '#ef4444' }} />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Session Not Found
          </h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            This session may have expired or been deleted. Sessions are kept for 30 days.
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // Time chart data
  const timeChartData = analysis.times.map((time, idx) => ({
    name: `Q${idx + 1}`,
    time,
    fill: time > 90 ? '#ef4444' : 'var(--accent-primary)',
  }));

  // Trend chart data
  const trendData = analysis.last10.map(point => ({
    date: point.date,
    accuracy: Math.round(point.accuracy * 10) / 10,
    isCurrent: point.isCurrent,
  }));

  const scoreDiff = analysis.accuracy - analysis.avgAccuracy;
  const timeDiff = analysis.avgTimePerQuestion - analysis.avgTimePerQ;

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/analytics"
        className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--accent-secondary)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Analytics
      </Link>

      {/* Section A: Session Header */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              {session.completedAt
                ? formatDateRange(session.startedAt, session.completedAt)
                : new Date(session.startedAt).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <ModeBadge mode={session.mode} subject={session.config?.subject} />
              {session.config?.timeLimit && (
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    color: 'var(--accent-secondary)',
                    background: 'rgba(197, 162, 88, 0.1)',
                    border: '1px solid rgba(197, 162, 88, 0.25)',
                  }}
                >
                  Timed
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2">
            {/* Large Score */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
                {analysis.correctAnswers}/{analysis.totalQuestions}
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: analysis.passed ? 'var(--accent-success)' : '#ef4444' }}
              >
                ({analysis.accuracy.toFixed(1)}%)
              </span>
            </div>
            {/* Pass/Fail */}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                background: analysis.passed ? 'rgba(0, 132, 61, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: analysis.passed ? 'var(--accent-success)' : '#ef4444',
                border: `1px solid ${analysis.passed ? 'rgba(0, 132, 61, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {analysis.passed ? (
                <><CheckCircle2 className="h-4 w-4" /> PASS</>
              ) : (
                <><XCircle className="h-4 w-4" /> NEEDS IMPROVEMENT</>
              )}
            </span>
          </div>
        </div>

        {/* Time Stats Row */}
        <div className="mt-4 pt-4 flex flex-wrap gap-6" style={{ borderTop: '1px solid var(--border)' }}>
          <StatItem label="Total Time" value={formatDuration(analysis.durationSeconds)} />
          <StatItem label="Avg per Question" value={`${analysis.avgTimePerQuestion.toFixed(1)}s`} />
          {allSessions.length > 1 && (
            <StatItem
              label="vs Your Average"
              value={`${scoreDiff >= 0 ? '+' : ''}${scoreDiff.toFixed(1)}%`}
              color={scoreDiff >= 0 ? 'var(--accent-success)' : '#ef4444'}
              icon={scoreDiff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : scoreDiff < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            />
          )}
        </div>
      </div>

      {/* Section B: Confidence Matrix */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Confidence x Correctness Matrix
        </h2>

        {matrixFilter && (
          <button
            onClick={() => setMatrixFilter(null)}
            className="mb-3 text-xs rounded-md px-2 py-1 transition-colors"
            style={{ color: 'var(--accent-secondary)', background: 'rgba(197, 162, 88, 0.1)' }}
          >
            Clear filter: {MATRIX_LABELS[matrixFilter]} x
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-lg overflow-hidden" style={{ background: 'var(--border)' }}>
          {/* Header Row */}
          <div className="p-3 text-center text-xs font-medium" style={{ background: 'var(--card-bg)', color: 'var(--foreground-secondary)' }}>
            &nbsp;
          </div>
          <div className="p-3 text-center text-xs font-semibold" style={{ background: 'var(--card-bg)', color: 'var(--accent-success)' }}>
            Correct
          </div>
          <div className="p-3 text-center text-xs font-semibold" style={{ background: 'var(--card-bg)', color: '#ef4444' }}>
            Incorrect
          </div>

          {/* Certain Row */}
          <div className="p-3 text-xs font-medium flex items-center justify-center" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
            Certain
          </div>
          <MatrixCell
            label="Mastered"
            count={analysis.matrix.mastered}
            total={analysis.totalQuestions}
            color="rgba(0, 132, 61, 0.15)"
            textColor="var(--accent-success)"
            active={matrixFilter === 'mastered'}
            onClick={() => setMatrixFilter(matrixFilter === 'mastered' ? null : 'mastered')}
          />
          <MatrixCell
            label="Misconception"
            count={analysis.matrix.misconception}
            total={analysis.totalQuestions}
            color="rgba(239, 68, 68, 0.15)"
            textColor="#ef4444"
            active={matrixFilter === 'misconception'}
            onClick={() => setMatrixFilter(matrixFilter === 'misconception' ? null : 'misconception')}
          />

          {/* ThinkSo Row */}
          <div className="p-3 text-xs font-medium flex items-center justify-center" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
            Think So
          </div>
          <MatrixCell
            label="Solid"
            count={analysis.matrix.solid}
            total={analysis.totalQuestions}
            color="rgba(0, 132, 61, 0.08)"
            textColor="var(--accent-success)"
            active={matrixFilter === 'solid'}
            onClick={() => setMatrixFilter(matrixFilter === 'solid' ? null : 'solid')}
          />
          <MatrixCell
            label="Weak Area"
            count={analysis.matrix.weakArea}
            total={analysis.totalQuestions}
            color="rgba(239, 68, 68, 0.08)"
            textColor="#ef4444"
            active={matrixFilter === 'weakArea'}
            onClick={() => setMatrixFilter(matrixFilter === 'weakArea' ? null : 'weakArea')}
          />

          {/* Guess Row */}
          <div className="p-3 text-xs font-medium flex items-center justify-center" style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>
            Guess
          </div>
          <MatrixCell
            label="Lucky"
            count={analysis.matrix.luckyGuess}
            total={analysis.totalQuestions}
            color="rgba(0, 132, 61, 0.04)"
            textColor="var(--accent-success)"
            active={matrixFilter === 'luckyGuess'}
            onClick={() => setMatrixFilter(matrixFilter === 'luckyGuess' ? null : 'luckyGuess')}
          />
          <MatrixCell
            label="Knowledge Gap"
            count={analysis.matrix.knowledgeGap}
            total={analysis.totalQuestions}
            color="rgba(239, 68, 68, 0.04)"
            textColor="#ef4444"
            active={matrixFilter === 'knowledgeGap'}
            onClick={() => setMatrixFilter(matrixFilter === 'knowledgeGap' ? null : 'knowledgeGap')}
          />
        </div>

        {/* Insight Text */}
        {analysis.matrix.misconception > 0 && (
          <p className="mt-4 text-sm rounded-lg p-3" style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444' }}>
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            {analysis.matrix.misconception} Misconception{analysis.matrix.misconception > 1 ? 's' : ''} detected
            - you were CERTAIN but wrong. Review these carefully.
          </p>
        )}
        {analysis.matrix.misconception === 0 && analysis.matrix.knowledgeGap > 0 && (
          <p className="mt-4 text-sm rounded-lg p-3" style={{ background: 'rgba(197, 162, 88, 0.05)', color: 'var(--accent-secondary)' }}>
            {analysis.matrix.knowledgeGap} Knowledge Gap{analysis.matrix.knowledgeGap > 1 ? 's' : ''} found
            - topics where you guessed and got it wrong. Focus study time here.
          </p>
        )}
      </div>

      {/* Section C: Time Analysis */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Time Analysis
        </h2>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-4 mb-4">
          <StatItem label="Fastest" value={`Q${analysis.fastestIdx + 1} (${analysis.fastestTime}s)`} />
          <StatItem label="Slowest" value={`Q${analysis.slowestIdx + 1} (${analysis.slowestTime}s)`} />
          <StatItem label="Median" value={`${analysis.medianTime}s`} />
          <StatItem label="Average" value={`${analysis.avgTimeLine.toFixed(1)}s`} />
        </div>

        {/* Time Insight */}
        {analysis.timeTraps.length > 0 && (
          <p className="text-xs mb-4 rounded-lg p-2" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--foreground-secondary)' }}>
            <Clock className="inline h-3.5 w-3.5 mr-1" style={{ color: '#ef4444' }} />
            You spent {formatDuration(analysis.timeTrapSeconds)} on {analysis.timeTraps.length} question{analysis.timeTraps.length > 1 ? 's' : ''} (&gt;90s each)
            - that is {analysis.totalQuestions > 0 ? ((analysis.timeTrapSeconds / analysis.durationSeconds) * 100).toFixed(0) : 0}% of total time on {analysis.totalQuestions > 0 ? ((analysis.timeTraps.length / analysis.totalQuestions) * 100).toFixed(0) : 0}% of questions.
          </p>
        )}

        {/* Bar Chart */}
        <div className="w-full h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
                interval={Math.max(0, Math.floor(timeChartData.length / 15))}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
                label={{ value: 'seconds', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--foreground-secondary)' }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <ReferenceLine y={analysis.avgTimeLine} stroke="var(--accent-secondary)" strokeDasharray="4 4" label={{ value: 'Avg', position: 'right', fontSize: 10, fill: 'var(--accent-secondary)' }} />
              {analysis.timeTraps.length > 0 && (
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="2 2" label={{ value: '90s', position: 'right', fontSize: 10, fill: '#ef4444' }} />
              )}
              <Bar dataKey="time" radius={[2, 2, 0, 0]}>
                {timeChartData.map((entry, idx) => (
                  <rect key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section D: Subject Performance Breakdown */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Subject Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2 px-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Subject</th>
                <th className="text-center py-2 px-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Qs</th>
                <th className="text-center py-2 px-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Correct</th>
                <th className="text-center py-2 px-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Accuracy</th>
                <th className="text-center py-2 px-2 text-xs font-medium hidden sm:table-cell" style={{ color: 'var(--foreground-secondary)' }}>Avg Time</th>
                <th className="text-center py-2 px-2 text-xs font-medium hidden md:table-cell" style={{ color: 'var(--foreground-secondary)' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {analysis.subjectRows.map((row) => (
                <tr key={row.subject} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2.5 px-2 text-xs font-medium max-w-[150px] truncate" style={{ color: 'var(--foreground)' }}>
                    {row.subject}
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {row.questions}
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {row.correct}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{
                        color: row.accuracy >= 80 ? 'var(--accent-success)' : row.accuracy >= 60 ? 'var(--accent-secondary)' : '#ef4444',
                        background: row.accuracy >= 80 ? 'rgba(0,132,61,0.1)' : row.accuracy >= 60 ? 'rgba(197,162,88,0.1)' : 'rgba(239,68,68,0.1)',
                      }}
                    >
                      {row.accuracy.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs hidden sm:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                    {row.avgTime.toFixed(1)}s
                  </td>
                  <td className="py-2.5 px-2 hidden md:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      <ConfDot color="var(--accent-success)" count={row.certainCount} />
                      <ConfDot color="var(--accent-secondary)" count={row.thinkSoCount} />
                      <ConfDot color="#ef4444" count={row.guessCount} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section E: Question Detail List */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Question Details
        </h2>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            ['all', 'All'],
            ['wrong', 'Wrong Only'],
            ['flagged', 'Flagged'],
            ['slow', 'Slow (>90s)'],
            ['misconceptions', 'Misconceptions'],
          ] as [QuestionFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setActiveFilter(key); setMatrixFilter(null); }}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: activeFilter === key && !matrixFilter ? 'var(--accent-primary)' : 'transparent',
                color: activeFilter === key && !matrixFilter ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                border: `1px solid ${activeFilter === key && !matrixFilter ? 'var(--accent-primary)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-3.5 w-3.5" style={{ color: 'var(--foreground-secondary)' }} />
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Sort:</span>
          {([
            ['number', 'Number'],
            ['time', 'Time'],
            ['confidence', 'Confidence'],
          ] as [QuestionSort, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveSort(key)}
              className="rounded-md px-2 py-1 text-xs transition-colors"
              style={{
                color: activeSort === key ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                fontWeight: activeSort === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Question List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredAttempts.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--foreground-secondary)' }}>
              No questions match the current filter.
            </p>
          ) : (
            filteredAttempts.map((attempt) => {
              const q = questionMap.get(attempt.questionId);
              const isExpanded = expandedQuestions.has(attempt.index);
              const correctChoice = q?.answerChoices.find(c => c.isCorrect);
              const isBookmarked = session.bookmarkedIds?.includes(attempt.questionId);
              const isFlagged = session.flaggedIds?.includes(attempt.questionId);

              return (
                <div
                  key={attempt.index}
                  className="rounded-lg border p-3 transition-colors"
                  style={{ borderColor: 'var(--border)', background: !attempt.correct ? 'rgba(239,68,68,0.02)' : 'transparent' }}
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => toggleExpand(attempt.index)}
                  >
                    {/* Question Number */}
                    <span className="text-xs font-mono font-semibold shrink-0 mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                      Q{attempt.index + 1}
                    </span>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>
                        {q?.questionText?.slice(0, 100) ?? 'Question not available'}
                        {(q?.questionText?.length ?? 0) > 100 ? '...' : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {/* Answer indicator */}
                        <span className="inline-flex items-center gap-1 text-xs">
                          {attempt.correct ? (
                            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--accent-success)' }} />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                          )}
                          <span style={{ color: attempt.correct ? 'var(--accent-success)' : '#ef4444' }}>
                            {attempt.selectedAnswer}
                          </span>
                          {!attempt.correct && correctChoice && (
                            <span style={{ color: 'var(--foreground-secondary)' }}>
                              (correct: {correctChoice.label})
                            </span>
                          )}
                        </span>

                        {/* Confidence Badge */}
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            color: attempt.confidence === 'Certain' ? 'var(--accent-success)' : attempt.confidence === 'ThinkSo' ? 'var(--accent-secondary)' : '#ef4444',
                            background: attempt.confidence === 'Certain' ? 'rgba(0,132,61,0.1)' : attempt.confidence === 'ThinkSo' ? 'rgba(197,162,88,0.1)' : 'rgba(239,68,68,0.1)',
                          }}
                        >
                          {attempt.confidence}
                        </span>

                        {/* Time */}
                        <span
                          className="text-[10px]"
                          style={{ color: attempt.timeSpentSeconds > 90 ? '#ef4444' : 'var(--foreground-secondary)' }}
                        >
                          {attempt.timeSpentSeconds}s
                        </span>

                        {/* Subject Tag */}
                        {q?.subject && (
                          <span className="text-[10px] rounded px-1.5 py-0.5" style={{ color: 'var(--foreground-secondary)', background: 'var(--border)' }}>
                            {q.subject.split(' ').slice(0, 2).join(' ')}
                          </span>
                        )}

                        {/* Bookmark/Flag */}
                        {isBookmarked && <Star className="h-3 w-3" style={{ color: 'var(--accent-secondary)' }} />}
                        {isFlagged && <Flag className="h-3 w-3" style={{ color: '#ef4444' }} />}
                      </div>
                    </div>

                    {/* Expand Toggle */}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'var(--foreground-secondary)' }} />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--foreground-secondary)' }} />
                    )}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && q && (
                    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                        {q.questionText}
                      </p>
                      <div className="space-y-1.5">
                        {q.answerChoices.map((choice) => (
                          <div
                            key={choice.label}
                            className="rounded-md p-2 text-xs"
                            style={{
                              background: choice.isCorrect
                                ? 'rgba(0,132,61,0.08)'
                                : choice.label === attempt.selectedAnswer && !attempt.correct
                                  ? 'rgba(239,68,68,0.08)'
                                  : 'transparent',
                              border: `1px solid ${choice.isCorrect ? 'rgba(0,132,61,0.3)' : choice.label === attempt.selectedAnswer && !attempt.correct ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-semibold shrink-0" style={{ color: choice.isCorrect ? 'var(--accent-success)' : 'var(--foreground)' }}>
                                {choice.label}.
                              </span>
                              <span style={{ color: 'var(--foreground)' }}>{choice.text}</span>
                            </div>
                            {choice.explanation && (choice.isCorrect || choice.label === attempt.selectedAnswer) && (
                              <p className="mt-1.5 pl-5 text-[11px]" style={{ color: 'var(--foreground-secondary)' }}>
                                {choice.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                        {q.topic && <span>Topic: {q.topic}</span>}
                        {q.difficulty && <span>Difficulty: {q.difficulty}</span>}
                        <span>Time: {attempt.timeSpentSeconds}s</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Showing {filteredAttempts.length} of {analysis.totalQuestions} questions
        </p>
      </div>

      {/* Section F: Comparison */}
      {allSessions.length > 1 && (
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            This Session vs Your Average
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ComparisonCard
              label="Score"
              current={`${analysis.accuracy.toFixed(1)}%`}
              average={`${analysis.avgAccuracy.toFixed(1)}%`}
              diff={scoreDiff}
              suffix="%"
              goodDirection="up"
            />
            <ComparisonCard
              label="Time/Question"
              current={`${analysis.avgTimePerQuestion.toFixed(1)}s`}
              average={`${analysis.avgTimePerQ.toFixed(1)}s`}
              diff={-timeDiff}
              suffix="s"
              goodDirection="down"
            />
            <ComparisonCard
              label="Guess Rate"
              current={`${analysis.thisGuessRate.toFixed(1)}%`}
              average={`${analysis.avgGuessRate.toFixed(1)}%`}
              diff={-(analysis.thisGuessRate - analysis.avgGuessRate)}
              suffix="%"
              goodDirection="down"
            />
            <ComparisonCard
              label="Misconceptions"
              current={`${analysis.thisMisconceptionRate.toFixed(1)}%`}
              average={`${analysis.avgMisconceptionRate.toFixed(1)}%`}
              diff={-(analysis.thisMisconceptionRate - analysis.avgMisconceptionRate)}
              suffix="%"
              goodDirection="down"
            />
          </div>

          {/* Mini Trend Chart */}
          {trendData.length >= 2 && (
            <div className="mt-6">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                Last {trendData.length} Sessions
              </p>
              <div className="w-full h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--foreground-secondary)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--foreground-secondary)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    />
                    <ReferenceLine y={72} stroke="#ef4444" strokeDasharray="2 2" />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="var(--accent-primary)"
                      strokeWidth={2}
                      dot={(props: Record<string, unknown>) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isCurrent: boolean } };
                        if (payload?.isCurrent) {
                          return <circle cx={cx} cy={cy} r={5} fill="var(--accent-secondary)" stroke="var(--accent-secondary)" />;
                        }
                        return <circle cx={cx} cy={cy} r={3} fill="var(--accent-primary)" stroke="var(--accent-primary)" />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section G: Action Items */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Create Flashcards */}
          {analysis.wrongQuestions.length > 0 && (
            <button
              onClick={() => setShowFlashcardCreator(!showFlashcardCreator)}
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
            >
              <Brain className="h-4 w-4" />
              Create Flashcards from {analysis.wrongQuestions.length} Wrong
            </button>
          )}

          {/* Retake Test */}
          <Link
            href={`/questions/session?mode=${session.mode}${session.config?.subject ? `&subject=${encodeURIComponent(session.config.subject)}` : ''}${session.config?.topic ? `&topic=${encodeURIComponent(session.config.topic)}` : ''}&count=${session.config?.questionCount ?? analysis.totalQuestions}`}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            <RotateCcw className="h-4 w-4" />
            Retake This Test
          </Link>

          {/* Practice Weak Topics */}
          {analysis.subjectRows.length > 0 && (
            <Link
              href={`/questions/session?mode=Subject&subject=${encodeURIComponent(analysis.subjectRows[0].subject)}&count=20`}
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              <TrendingUp className="h-4 w-4" />
              Practice Weak Topics
            </Link>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          {/* Share Score */}
          <button
            onClick={handleShareScore}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            <Share2 className="h-4 w-4" />
            {shareMessage || 'Share Score'}
          </button>
        </div>

        {/* Flashcard Creator Inline */}
        {showFlashcardCreator && analysis.wrongQuestions.length > 0 && (
          <div className="mt-4">
            <BatchFlashcardCreator incorrectQuestions={analysis.wrongQuestions} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Helper Components ============

const MODE_LABELS: Record<string, string> = {
  Topic: 'Topic Test',
  Subject: 'Subject Test',
  Mixed: 'Mixed Test',
  QuickTopic: 'Quick Test',
  AdaptiveRetest: 'Adaptive Retest',
  Random: 'Random Test',
  WeakTopic: 'Weak Topic',
  Mock: 'Mock CFA Exam',
};

const MATRIX_LABELS: Record<string, string> = {
  mastered: 'Mastered',
  solid: 'Solid',
  luckyGuess: 'Lucky Guess',
  misconception: 'Misconception',
  weakArea: 'Weak Area',
  knowledgeGap: 'Knowledge Gap',
};

function ModeBadge({ mode, subject }: { mode: string; subject?: string }) {
  const label = subject
    ? `${subject.split(' ').slice(0, 3).join(' ')} ${MODE_LABELS[mode] ?? mode}`
    : MODE_LABELS[mode] ?? mode;
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
      style={{
        color: 'var(--accent-primary)',
        background: 'rgba(0, 43, 92, 0.08)',
        border: '1px solid rgba(0, 43, 92, 0.2)',
      }}
    >
      {label}
    </span>
  );
}

function StatItem({ label, value, color, icon }: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: color ?? 'var(--foreground)' }}>
        {icon}
        {value}
      </span>
    </div>
  );
}

function MatrixCell({
  label,
  count,
  total,
  color,
  textColor,
  active,
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  textColor: string;
  active: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  return (
    <button
      onClick={onClick}
      className="p-3 text-center transition-all"
      style={{
        background: color,
        outline: active ? `2px solid ${textColor}` : 'none',
        outlineOffset: '-2px',
      }}
    >
      <p className="text-lg font-bold" style={{ color: textColor }}>{count}</p>
      <p className="text-[10px]" style={{ color: textColor }}>{label} ({pct}%)</p>
    </button>
  );
}

function ConfDot({ color, count }: { color: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {count}
    </span>
  );
}

function ComparisonCard({
  label,
  current,
  average,
  diff,
  goodDirection,
}: {
  label: string;
  current: string;
  average: string;
  diff: number;
  suffix: string;
  goodDirection: 'up' | 'down';
}) {
  const isGood = goodDirection === 'up' ? diff > 0 : diff > 0;
  const isBad = goodDirection === 'up' ? diff < 0 : diff < 0;
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{current}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
        avg: {average}
      </p>
      {diff !== 0 && (
        <p
          className="text-[10px] font-medium mt-1 flex items-center gap-0.5"
          style={{ color: isGood ? 'var(--accent-success)' : isBad ? '#ef4444' : 'var(--foreground-secondary)' }}
        >
          {isGood ? <TrendingUp className="h-3 w-3" /> : isBad ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {Math.abs(diff).toFixed(1)}
        </p>
      )}
    </div>
  );
}
