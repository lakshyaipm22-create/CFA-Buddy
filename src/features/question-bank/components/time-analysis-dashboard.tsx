'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Clock, Zap, Brain, AlertTriangle } from 'lucide-react';
import type { PracticeAttempt, AttemptQuestion } from '../types/attempt';
import type { Question } from '../types';
import { loadAllQuestions } from '../utils/question-loader';
import {
  computeTimeVsCorrectness,
  computeTimeTrends,
  identifySlowestQuestions,
  computePaceAnalysis,
} from '../utils/time-analysis';

const ScatterChart = dynamic(() => import('recharts').then(m => m.ScatterChart), { ssr: false });
const Scatter = dynamic(() => import('recharts').then(m => m.Scatter), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });

interface TimeAnalysisDashboardProps {
  attempt: PracticeAttempt;
  allAttempts: PracticeAttempt[];
}

const PACE_EMOJI: Record<string, string> = {
  Rushing: '\u26A1',
  Optimal: '\u2705',
  Overthinking: '\uD83E\uDD14',
};

const PACE_COLOR: Record<string, string> = {
  Rushing: '#ef4444',
  Optimal: 'var(--accent-success)',
  Overthinking: '#f97316',
};

export function TimeAnalysisDashboard({ attempt, allAttempts }: TimeAnalysisDashboardProps) {
  const questions = useMemo(() => loadAllQuestions(), []);

  const allQuestionAttempts = useMemo(() => {
    const result: AttemptQuestion[] = [];
    for (const mod of attempt.moduleResults) {
      result.push(...mod.questionAttempts);
    }
    return result;
  }, [attempt]);

  const timeVsCorrectness = useMemo(
    () => computeTimeVsCorrectness(allQuestionAttempts),
    [allQuestionAttempts]
  );

  const timeTrends = useMemo(
    () => computeTimeTrends(allAttempts),
    [allAttempts]
  );

  const slowestQuestions = useMemo(
    () => identifySlowestQuestions(allQuestionAttempts, questions, 10),
    [allQuestionAttempts, questions]
  );

  const paceAnalysis = useMemo(
    () => computePaceAnalysis(allQuestionAttempts),
    [allQuestionAttempts]
  );

  const scatterCorrectData = useMemo(
    () => timeVsCorrectness.correctPoints.map((p, i) => ({ x: i + 1, y: p.timeSpentSeconds, name: `Q${i + 1}` })),
    [timeVsCorrectness]
  );

  const scatterIncorrectData = useMemo(
    () => timeVsCorrectness.incorrectPoints.map((p, i) => ({ x: i + 1, y: p.timeSpentSeconds, name: `Q${i + 1}` })),
    [timeVsCorrectness]
  );

  const barData = useMemo(
    () => slowestQuestions.map((q, i) => ({
      name: `Q${i + 1}`,
      time: q.timeSpentSeconds,
      correct: q.correct,
      fullText: q.questionText.slice(0, 60) + (q.questionText.length > 60 ? '...' : ''),
    })),
    [slowestQuestions]
  );

  return (
    <div className="space-y-6">
      {/* Pace Analysis Card */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Pace Analysis
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{PACE_EMOJI[paceAnalysis.category]}</span>
            <div>
              <p className="text-xl font-bold" style={{ color: PACE_COLOR[paceAnalysis.category] }}>
                {paceAnalysis.category}
              </p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                {Math.round(paceAnalysis.averageTime)}s average per question
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--background-tertiary)' }}>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Median</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {Math.round(paceAnalysis.medianTime)}s
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--background-tertiary)' }}>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>P75</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {Math.round(paceAnalysis.p75)}s
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--background-tertiary)' }}>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>P25</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {Math.round(paceAnalysis.p25)}s
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--background-tertiary)' }}>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>P90</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {Math.round(paceAnalysis.p90)}s
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-4 rounded-lg p-3 text-sm"
          style={{
            backgroundColor: 'rgba(197, 162, 88, 0.1)',
            border: '1px solid rgba(197, 162, 88, 0.2)',
            color: 'var(--foreground-secondary)',
          }}
        >
          <div className="flex items-start gap-2">
            {paceAnalysis.category === 'Rushing' && <Zap className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#ef4444' }} />}
            {paceAnalysis.category === 'Optimal' && <Brain className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-success)' }} />}
            {paceAnalysis.category === 'Overthinking' && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#f97316' }} />}
            <p>{paceAnalysis.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Time vs Correctness Scatter Plot */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Time vs Correctness
        </h3>
        <div className="flex items-center gap-4 mb-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--accent-success)' }} />
            Correct (avg {Math.round(timeVsCorrectness.averageTimeCorrect)}s)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            Incorrect (avg {Math.round(timeVsCorrectness.averageTimeIncorrect)}s)
          </span>
        </div>

        {allQuestionAttempts.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Question"
                  label={{ value: 'Question #', position: 'bottom', fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Time (s)"
                  label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Scatter name="Correct" data={scatterCorrectData} fill="var(--accent-success)" />
                <Scatter name="Incorrect" data={scatterIncorrectData} fill="#ef4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: 'var(--foreground-secondary)' }}>
            No question data available.
          </p>
        )}
      </div>

      {/* Time Trend Line Chart */}
      {timeTrends.length > 1 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Average Time Trend
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeTrends} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                  label={{ value: 'Avg Time (s)', angle: -90, position: 'insideLeft', fill: 'var(--foreground-secondary)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgTimeSeconds"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent-primary)', r: 4 }}
                  name="Avg Time (s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Slowest Questions Bar Chart */}
      {barData.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Top {barData.length} Slowest Questions
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                  label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: 'var(--foreground-secondary)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value: unknown) => [`${value}s`, 'Time Spent']}
                />
                <Bar dataKey="time" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Slowest questions detail list */}
          <div className="mt-4 space-y-2">
            {slowestQuestions.slice(0, 5).map((q, i) => (
              <div
                key={q.questionId}
                className="flex items-center justify-between rounded-lg p-2 text-sm"
                style={{ backgroundColor: 'var(--background-tertiary)' }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium shrink-0" style={{ color: 'var(--foreground-secondary)' }}>
                    #{i + 1}
                  </span>
                  <span className="truncate" style={{ color: 'var(--foreground)' }}>
                    {q.questionText.slice(0, 80)}{q.questionText.length > 80 ? '...' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className="font-medium"
                    style={{ color: q.correct ? 'var(--accent-success)' : '#ef4444' }}
                  >
                    {q.correct ? 'Correct' : 'Wrong'}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {q.timeSpentSeconds}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
