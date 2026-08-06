'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from 'recharts';
import { CheckCircle, XCircle, Clock, BarChart3, ArrowLeft, TrendingUp } from 'lucide-react';
import type { MockExamResult } from '../types';
import { getMockExamById, getMockExamHistory } from '../utils/storage';
import { PASSING_THRESHOLD } from '../utils/exam-config';
import { formatTime } from '../utils/scoring';

interface MockExamResultsProps {
  examId: string;
}

export function MockExamResults({ examId }: MockExamResultsProps) {
  const router = useRouter();
  const [result] = useState<MockExamResult | null>(() => getMockExamById(examId));
  const history = useMemo(() => getMockExamHistory(), []);

  if (!result) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--foreground)' }}>Exam result not found.</p>
        <button
          onClick={() => router.push('/mock-exam')}
          className="rounded-lg px-6 py-2 font-medium text-white"
          style={{ background: '#002B5C' }}
        >
          Back to Mock Exam
        </button>
      </div>
    );
  }

  const scorePercent = Math.round(result.score * 100);
  const thresholdPercent = Math.round(PASSING_THRESHOLD * 100);

  const subjectChartData = result.subjectScores.map((s) => ({
    name: s.subject.length > 15 ? s.subject.substring(0, 15) + '...' : s.subject,
    fullName: s.subject,
    accuracy: Math.round(s.accuracy * 100),
    correct: s.correct,
    total: s.total,
  }));

  const progressionData = history.exams.map((exam, idx) => ({
    attempt: idx + 1,
    score: Math.round(exam.score * 100),
    date: new Date(exam.completedAt).toLocaleDateString(),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/mock-exam')}
        className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
        style={{ color: 'var(--foreground-secondary)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Mock Exam
      </button>

      {/* Score Header */}
      <div
        className="rounded-xl border p-8 text-center"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="mb-4">
          {result.passed ? (
            <CheckCircle className="mx-auto h-16 w-16" style={{ color: '#00843D' }} />
          ) : (
            <XCircle className="mx-auto h-16 w-16" style={{ color: '#ef4444' }} />
          )}
        </div>
        <h1
          className="text-4xl font-bold"
          style={{ color: result.passed ? '#00843D' : '#ef4444' }}
        >
          {scorePercent}%
        </h1>
        <p
          className="mt-2 text-xl font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          {result.passed ? 'PASSED' : 'NOT PASSED'}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          {result.correctAnswers} of {result.totalQuestions} correct | Passing: {thresholdPercent}%
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl border p-4 text-center"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <Clock className="mx-auto mb-2 h-5 w-5" style={{ color: '#C5A258' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {formatTime(result.timeUsedSeconds)}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Time Used
          </p>
        </div>
        <div
          className="rounded-xl border p-4 text-center"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <BarChart3 className="mx-auto mb-2 h-5 w-5" style={{ color: '#C5A258' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {result.totalQuestions > 0
              ? `${Math.round(result.timeUsedSeconds / result.totalQuestions)}s`
              : '0s'}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Avg Time/Question
          </p>
        </div>
        <div
          className="rounded-xl border p-4 text-center"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <TrendingUp className="mx-auto mb-2 h-5 w-5" style={{ color: '#C5A258' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {result.answers.filter((a) => a.selectedAnswer === null).length}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Unanswered
          </p>
        </div>
      </div>

      {/* Per-Subject Breakdown Bar Chart */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
          Subject Breakdown
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: '#1a1f2b', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`${value}%`, 'Score']}
                labelFormatter={(label) => {
                  const item = subjectChartData.find((d) => d.name === label);
                  return item?.fullName ?? String(label);
                }}
              />
              <ReferenceLine x={thresholdPercent} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `${thresholdPercent}%`, fill: '#ef4444', fontSize: 11 }} />
              <Bar dataKey="accuracy" fill="#002B5C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Table */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
          Detailed Scores
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="pb-3 text-left font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  Subject
                </th>
                <th className="pb-3 text-right font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  Correct
                </th>
                <th className="pb-3 text-right font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  Total
                </th>
                <th className="pb-3 text-right font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  Score
                </th>
                <th className="pb-3 text-right font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {result.subjectScores.map((s) => (
                <tr key={s.subject} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2" style={{ color: 'var(--foreground)' }}>
                    {s.subject}
                  </td>
                  <td className="py-2 text-right" style={{ color: 'var(--foreground-secondary)' }}>
                    {s.correct}
                  </td>
                  <td className="py-2 text-right" style={{ color: 'var(--foreground-secondary)' }}>
                    {s.total}
                  </td>
                  <td
                    className="py-2 text-right font-medium"
                    style={{ color: s.accuracy >= PASSING_THRESHOLD ? '#00843D' : '#ef4444' }}
                  >
                    {Math.round(s.accuracy * 100)}%
                  </td>
                  <td className="py-2 text-right">
                    {s.accuracy >= PASSING_THRESHOLD ? (
                      <CheckCircle className="ml-auto h-4 w-4" style={{ color: '#00843D' }} />
                    ) : (
                      <XCircle className="ml-auto h-4 w-4" style={{ color: '#ef4444' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Progression Chart */}
      {progressionData.length > 1 && (
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Score Progression
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="attempt"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  label={{ value: 'Attempt', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  label={{ value: 'Score %', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1f2b', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => `Attempt ${label}`}
                />
                <ReferenceLine y={thresholdPercent} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Pass', fill: '#ef4444', fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#C5A258"
                  strokeWidth={2}
                  dot={{ fill: '#C5A258', r: 4 }}
                  activeDot={{ r: 6, fill: '#C5A258' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={() => router.push('/mock-exam')}
          className="rounded-lg px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#002B5C' }}
        >
          Take Another Exam
        </button>
      </div>
    </div>
  );
}
