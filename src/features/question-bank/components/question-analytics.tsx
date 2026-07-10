'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { QuestionSession, QuestionAttempt } from '../types';

// CFA Brand Colors
const CFA_NAVY = '#002B5C';
const CFA_GOLD = '#C5A258';

interface TopicStats {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTime: number;
}

interface MonthlyData {
  month: string;
  accuracy: number;
}

interface SessionTrend {
  session: number;
  accuracy: number;
  guessRate: number;
}

function computeAnalytics(sessions: QuestionSession[]) {
  const completed = sessions.filter((s) => s.status === 'completed');

  if (completed.length === 0) {
    return null;
  }

  const allAttempts: QuestionAttempt[] = completed.flatMap((s) => s.attempts);
  const totalQuestions = allAttempts.length;
  const correctAnswers = allAttempts.filter((a) => a.correct).length;
  const overallAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const avgTime =
    totalQuestions > 0
      ? allAttempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / totalQuestions
      : 0;
  const guessCount = allAttempts.filter((a) => a.confidence === 'Guess').length;
  const guessRate = totalQuestions > 0 ? (guessCount / totalQuestions) * 100 : 0;

  // Confidence calibration - certain answers that were correct
  const certainAttempts = allAttempts.filter((a) => a.confidence === 'Certain');
  const certainCorrect = certainAttempts.filter((a) => a.correct).length;
  const calibrationScore =
    certainAttempts.length > 0 ? (certainCorrect / certainAttempts.length) * 100 : 0;

  // Topic weakness analysis
  const topicMap: Record<string, { correct: number; total: number; totalTime: number }> = {};
  for (const session of completed) {
    for (const attempt of session.attempts) {
      // We need the topic from the session config or from attempt context
      // Since QuestionAttempt doesn't carry topic, we derive from session config
      const topic = session.config.topic || session.config.subject || session.mode;
      if (!topicMap[topic]) {
        topicMap[topic] = { correct: 0, total: 0, totalTime: 0 };
      }
      topicMap[topic].total += 1;
      topicMap[topic].totalTime += attempt.timeSpentSeconds;
      if (attempt.correct) {
        topicMap[topic].correct += 1;
      }
    }
  }

  const topicStats: TopicStats[] = Object.entries(topicMap)
    .map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      avgTime: stats.total > 0 ? stats.totalTime / stats.total : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10);

  // Monthly accuracy over last 12 months
  const now = new Date();
  const monthlyMap: Record<string, { correct: number; total: number }> = {};

  for (const session of completed) {
    const date = new Date(session.completedAt || session.startedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { correct: 0, total: 0 };
    }
    for (const attempt of session.attempts) {
      monthlyMap[monthKey].total += 1;
      if (attempt.correct) {
        monthlyMap[monthKey].correct += 1;
      }
    }
  }

  // Generate last 12 months
  const monthlyData: MonthlyData[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (monthlyMap[key]) {
      const { correct, total } = monthlyMap[key];
      monthlyData.push({
        month: monthLabel,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      });
    } else {
      monthlyData.push({ month: monthLabel, accuracy: 0 });
    }
  }

  // Filter to only months with data
  const monthlyDataWithValues = monthlyData.filter((d) => d.accuracy > 0);

  // Session trends (accuracy and guess rate per session)
  const sessionTrends: SessionTrend[] = completed
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((session, idx) => {
      const correct = session.attempts.filter((a) => a.correct).length;
      const total = session.attempts.length;
      const guesses = session.attempts.filter((a) => a.confidence === 'Guess').length;
      return {
        session: idx + 1,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        guessRate: total > 0 ? Math.round((guesses / total) * 100) : 0,
      };
    });

  return {
    totalQuestions,
    correctAnswers,
    overallAccuracy,
    avgTime,
    guessRate,
    totalSessions: completed.length,
    calibrationScore,
    certainCount: certainAttempts.length,
    topicStats,
    monthlyData: monthlyDataWithValues,
    sessionTrends,
  };
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(197, 162, 88, 0.1)' }}
      >
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke={CFA_GOLD}
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      </div>
      <h3
        className="text-lg font-semibold"
        style={{ color: 'var(--foreground)' }}
      >
        No Analytics Yet
      </h3>
      <p
        className="mx-auto mt-2 max-w-sm text-sm"
        style={{ color: 'var(--foreground-secondary)' }}
      >
        Complete your first practice session to see detailed performance analytics,
        confidence calibration, and progress tracking.
      </p>
      <div
        className="mx-auto mt-4 h-1 w-24 rounded-full"
        style={{ backgroundColor: CFA_GOLD }}
      />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
    </div>
  );
}

export function QuestionAnalytics() {
  const [sessions] = useState<QuestionSession[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('cfa-buddy-sessions');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });

  const analytics = computeAnalytics(sessions);

  if (!analytics) {
    return <EmptyState />;
  }

  const {
    totalQuestions,
    overallAccuracy,
    avgTime,
    guessRate,
    totalSessions,
    calibrationScore,
    certainCount,
    topicStats,
    monthlyData,
    sessionTrends,
  } = analytics;

  const calibrationLabel =
    calibrationScore > 80
      ? 'Well calibrated'
      : calibrationScore >= 60
        ? 'Moderate'
        : 'Overconfident';

  const calibrationColor =
    calibrationScore > 80
      ? 'var(--accent-success)'
      : calibrationScore >= 60
        ? CFA_GOLD
        : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Performance Analytics
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Aggregated data across all completed sessions
        </p>
      </div>

      {/* Overall Stats Bar */}
      <div
        className="grid grid-cols-2 gap-4 rounded-2xl p-5 md:grid-cols-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <StatItem label="Total Questions" value={String(totalQuestions)} />
        <StatItem label="Accuracy" value={`${Math.round(overallAccuracy)}%`} />
        <StatItem label="Avg Time" value={`${Math.round(avgTime)}s`} />
        <StatItem label="Sessions" value={String(totalSessions)} />
        <StatItem label="Guess Rate" value={`${Math.round(guessRate)}%`} />
      </div>

      {/* Confidence Calibration Card */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h3
          className="mb-3 text-base font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          Confidence Calibration
        </h3>
        <p className="mb-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Of questions marked &quot;Certain&quot;, what % were correct?
        </p>
        {certainCount > 0 ? (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className="text-4xl font-bold"
                style={{ color: calibrationColor }}
              >
                {Math.round(calibrationScore)}%
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor:
                    calibrationScore > 80
                      ? 'rgba(0, 132, 61, 0.15)'
                      : calibrationScore >= 60
                        ? 'rgba(197, 162, 88, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                  color: calibrationColor,
                }}
              >
                {calibrationLabel}
              </span>
            </div>
            <div className="mt-3">
              <div
                className="h-3 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(calibrationScore, 100)}%`,
                    backgroundColor: calibrationColor,
                  }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Based on {certainCount} questions answered with &quot;Certain&quot; confidence
              </p>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            No questions answered with &quot;Certain&quot; confidence yet.
          </p>
        )}
      </div>

      {/* Topic Weakness Analysis */}
      {topicStats.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3
            className="mb-4 text-base font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Topic Weakness Analysis
          </h3>
          <p className="mb-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Weakest topics ranked by accuracy (up to 10)
          </p>
          <div className="space-y-4">
            {topicStats.map((topic) => {
              const barColor =
                topic.accuracy < 50
                  ? '#ef4444'
                  : topic.accuracy <= 70
                    ? '#f97316'
                    : 'var(--accent-success)';
              return (
                <div key={topic.topic} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {topic.topic}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {topic.total} Qs | Avg {Math.round(topic.avgTime)}s
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: barColor }}
                      >
                        {Math.round(topic.accuracy)}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${topic.accuracy}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Timeline */}
      {monthlyData.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3
            className="mb-4 text-base font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Progress Timeline
          </h3>
          <p className="mb-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Monthly accuracy over time
          </p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  label={{
                    value: 'Accuracy %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--foreground-secondary)',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke={CFA_GOLD}
                  strokeWidth={2.5}
                  dot={{ fill: CFA_GOLD, r: 4 }}
                  activeDot={{ r: 6, fill: CFA_GOLD }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Attempt Comparison */}
      {sessionTrends.length > 1 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3
            className="mb-4 text-base font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Accuracy Trend Across Sessions
          </h3>
          <p className="mb-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Your accuracy progression session over session
          </p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sessionTrends}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="session"
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  label={{
                    value: 'Session',
                    position: 'insideBottom',
                    offset: -5,
                    fill: 'var(--foreground-secondary)',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  label={{
                    value: 'Accuracy %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--foreground-secondary)',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                  labelFormatter={(label) => `Session ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke={CFA_NAVY}
                  strokeWidth={2.5}
                  dot={{ fill: CFA_NAVY, r: 4 }}
                  activeDot={{ r: 6, fill: CFA_NAVY }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Guess Rate Trend */}
      {sessionTrends.length > 1 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3
            className="mb-4 text-base font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Guess Rate Trend
          </h3>
          <p className="mb-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Percentage of guesses per session over time
          </p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sessionTrends}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="session"
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  label={{
                    value: 'Session',
                    position: 'insideBottom',
                    offset: -5,
                    fill: 'var(--foreground-secondary)',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  label={{
                    value: 'Guess Rate %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--foreground-secondary)',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => [`${value}%`, 'Guess Rate']}
                  labelFormatter={(label) => `Session ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="guessRate"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6, fill: '#f97316' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
