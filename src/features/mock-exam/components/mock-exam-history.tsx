'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { CheckCircle, XCircle, Calendar, TrendingUp } from 'lucide-react';
import type { MockExamHistory as MockExamHistoryType } from '../types';
import { getMockExamHistory } from '../utils/storage';
import { PASSING_THRESHOLD } from '../utils/exam-config';
import { formatTime } from '../utils/scoring';

export function MockExamHistory() {
  const router = useRouter();
  const [history] = useState<MockExamHistoryType>(() => getMockExamHistory());

  if (history.exams.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <p className="text-lg" style={{ color: 'var(--foreground-secondary)' }}>
          No mock exams completed yet.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Complete your first mock exam to see your history here.
        </p>
      </div>
    );
  }

  const thresholdPercent = Math.round(PASSING_THRESHOLD * 100);

  const trendData = history.exams.map((exam, idx) => ({
    attempt: idx + 1,
    score: Math.round(exam.score * 100),
    date: new Date(exam.completedAt).toLocaleDateString(),
  }));

  return (
    <div className="space-y-6">
      {/* Trend Chart */}
      {history.exams.length > 1 && (
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: '#C5A258' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Score Trend
            </h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="attempt" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                contentStyle={{ background: '#1a1f2b', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`${value}%`, 'Score']}
                labelFormatter={(label) => `Attempt ${label}`}
              />
                <ReferenceLine y={thresholdPercent} stroke="#ef4444" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#C5A258"
                  strokeWidth={2}
                  dot={{ fill: '#C5A258', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Exam List */}
      <div className="space-y-3">
        {[...history.exams].reverse().map((exam) => (
          <button
            key={exam.id}
            onClick={() => router.push(`/mock-exam/results/${exam.id}`)}
            className="flex w-full items-center justify-between rounded-xl border p-4 text-left transition-opacity hover:opacity-90"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-4">
              {exam.passed ? (
                <CheckCircle className="h-6 w-6 flex-shrink-0" style={{ color: '#00843D' }} />
              ) : (
                <XCircle className="h-6 w-6 flex-shrink-0" style={{ color: '#ef4444' }} />
              )}
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {Math.round(exam.score * 100)}% - {exam.passed ? 'Passed' : 'Not Passed'}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(exam.completedAt).toLocaleDateString()}
                  </span>
                  <span>{exam.correctAnswers}/{exam.totalQuestions} correct</span>
                  <span>{formatTime(exam.timeUsedSeconds)}</span>
                </div>
              </div>
            </div>
            <span
              className="text-2xl font-bold"
              style={{ color: exam.passed ? '#00843D' : '#ef4444' }}
            >
              {Math.round(exam.score * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
