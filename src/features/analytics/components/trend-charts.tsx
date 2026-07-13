'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { AnalyticsSession } from '../types';
import { computeSubjectProgression } from '../utils/trend-engine';
import { sortByCfaOrder } from '@/shared/config/subjects';
import { Sparkline } from '@/features/weekly-report/components/sparkline';

// Lazy-load all Recharts components (no SSR)
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(m => m.ReferenceLine), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

const SUBJECT_COLORS: Record<string, string> = {
  'Quantitative Methods': '#8b5cf6',
  'Economics': '#06b6d4',
  'Corporate Issuers': '#f97316',
  'Financial Statement Analysis': '#ec4899',
  'Equity Investments': '#10b981',
  'Fixed Income': '#ef4444',
  'Derivatives': '#a855f7',
  'Alternative Investments': '#14b8a6',
  'Portfolio Management': '#f59e0b',
  'Ethical and Professional Standards': '#6366f1',
  'Mixed': '#64748b',
};

interface TrendChartsProps {
  sessions: AnalyticsSession[];
}

export function TrendCharts({ sessions }: TrendChartsProps) {
  if (sessions.length < 2) {
    return (
      <div
        className="rounded-xl border border-dashed p-12 text-center"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <TrendingUp
          className="mx-auto h-12 w-12 opacity-30"
          style={{ color: 'var(--foreground-secondary)' }}
        />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Need More Data
        </h3>
        <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--foreground-secondary)' }}>
          Complete at least 2-3 sessions to see meaningful trend analysis. Keep practicing!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccuracyOverTimeChart sessions={sessions} />
      <TimeEfficiencyChart sessions={sessions} />
      <ConfidenceCalibrationChart sessions={sessions} />
      <SubjectProgressionSection sessions={sessions} />
    </div>
  );
}

/* ===== A. Accuracy Over Time ===== */

function AccuracyOverTimeChart({ sessions }: { sessions: AnalyticsSession[] }) {
  const [enabledSubjects, setEnabledSubjects] = useState<Set<string>>(new Set(['Overall']));

  const { chartData, subjects } = useMemo(() => {
    // Group sessions by day, compute overall accuracy per day
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    const byDay: Record<string, AnalyticsSession[]> = {};
    for (const s of sorted) {
      const day = s.startedAt.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(s);
    }

    const days = Object.keys(byDay).sort();
    const subjectSet = new Set<string>();

    // Build per-day data with subject breakdowns
    const rawData: Array<Record<string, number | string>> = days.map(day => {
      const daySessions = byDay[day];
      const totalQ = daySessions.reduce((sum, s) => sum + s.totalQuestions, 0);
      const totalC = daySessions.reduce((sum, s) => sum + s.correctAnswers, 0);
      const overall = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

      const row: Record<string, number | string> = {
        date: day,
        dateLabel: formatShortDate(day),
        Overall: overall,
      };

      // Per-subject accuracy for this day
      const bySubject: Record<string, { correct: number; total: number }> = {};
      for (const s of daySessions) {
        const subject = s.subject ?? 'Mixed';
        if (!bySubject[subject]) bySubject[subject] = { correct: 0, total: 0 };
        bySubject[subject].correct += s.correctAnswers;
        bySubject[subject].total += s.totalQuestions;
        subjectSet.add(subject);
      }

      for (const [subject, stats] of Object.entries(bySubject)) {
        row[subject] = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      }

      return row;
    });

    // Compute 7-day moving average for Overall
    const chartData = rawData.map((row, idx) => {
      const start = Math.max(0, idx - 6);
      const window = rawData.slice(start, idx + 1);
      const maValues = window
        .map(w => w.Overall as number)
        .filter(v => typeof v === 'number');
      const ma = maValues.length > 0 ? Math.round(maValues.reduce((s, v) => s + v, 0) / maValues.length) : 0;
      return { ...row, 'Moving Avg (7d)': ma };
    });

    const subjects = sortByCfaOrder([...subjectSet]);
    return { chartData, subjects };
  }, [sessions]);

  const toggleSubject = (subject: string) => {
    setEnabledSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  return (
    <div
      className="rounded-xl border p-4 md:p-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
        Accuracy Over Time
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
        Daily accuracy with 7-day moving average. 72% = CFA pass threshold.
      </p>

      {/* Subject toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        <ToggleChip
          label="Overall"
          color="var(--accent-primary)"
          active={enabledSubjects.has('Overall')}
          onClick={() => toggleSubject('Overall')}
        />
        {subjects.map(subject => (
          <ToggleChip
            key={subject}
            label={subject.split(' ').slice(0, 2).join(' ')}
            color={SUBJECT_COLORS[subject] ?? '#64748b'}
            active={enabledSubjects.has(subject)}
            onClick={() => toggleSubject(subject)}
          />
        ))}
      </div>

      <div className="w-full h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
            />
            {/* 72% Pass Threshold */}
            <ReferenceLine
              y={72}
              stroke="var(--accent-success)"
              strokeDasharray="5 5"
              label={{ value: '72% Pass', position: 'right', fill: 'var(--accent-success)', fontSize: 10 }}
            />
            {/* Overall line */}
            {enabledSubjects.has('Overall') && (
              <Line
                type="monotone"
                dataKey="Overall"
                stroke="var(--accent-primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent-primary)' }}
                connectNulls
              />
            )}
            {/* Moving average line */}
            {enabledSubjects.has('Overall') && (
              <Line
                type="monotone"
                dataKey="Moving Avg (7d)"
                stroke="var(--accent-secondary)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            )}
            {/* Subject lines */}
            {subjects.map(subject =>
              enabledSubjects.has(subject) ? (
                <Line
                  key={subject}
                  type="monotone"
                  dataKey={subject}
                  stroke={SUBJECT_COLORS[subject] ?? '#64748b'}
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===== B. Time Efficiency Trend ===== */

function TimeEfficiencyChart({ sessions }: { sessions: AnalyticsSession[] }) {
  const chartData = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    return sorted.map(s => {
      const avgTime = s.totalQuestions > 0
        ? Math.round(s.durationSeconds / s.totalQuestions)
        : 0;
      return {
        date: s.startedAt.slice(0, 10),
        dateLabel: formatShortDate(s.startedAt.slice(0, 10)),
        avgTimePerQ: avgTime,
        sessionLabel: `${s.mode}${s.subject ? ` - ${s.subject.split(' ').slice(0, 2).join(' ')}` : ''}`,
      };
    });
  }, [sessions]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return 'flat';
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    const avgFirst = firstHalf.reduce((s, d) => s + d.avgTimePerQ, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, d) => s + d.avgTimePerQ, 0) / secondHalf.length;
    if (avgSecond < avgFirst - 5) return 'faster';
    if (avgSecond > avgFirst + 5) return 'slower';
    return 'flat';
  }, [chartData]);

  return (
    <div
      className="rounded-xl border p-4 md:p-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
          Time Efficiency
        </h3>
        {trend === 'faster' && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-success)' }}>
            <TrendingDown className="h-3.5 w-3.5" /> Getting faster
          </span>
        )}
        {trend === 'slower' && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#ef4444' }}>
            <TrendingUp className="h-3.5 w-3.5" /> Getting slower
          </span>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
        Average seconds per question per session. Target: 90s (CFA exam pace).
      </p>

      <div className="w-full h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              unit="s"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
              formatter={(value) => [`${value}s`, 'Avg Time/Question']}
            />
            {/* 90s CFA Benchmark */}
            <ReferenceLine
              y={90}
              stroke="var(--accent-secondary)"
              strokeDasharray="5 5"
              label={{ value: '90s Benchmark', position: 'right', fill: 'var(--accent-secondary)', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="avgTimePerQ"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--accent-primary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===== C. Confidence Calibration Trend ===== */

function ConfidenceCalibrationChart({ sessions }: { sessions: AnalyticsSession[] }) {
  const { chartData, latestCalibration } = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    // Group by day
    const byDay: Record<string, AnalyticsSession[]> = {};
    for (const s of sorted) {
      const day = s.startedAt.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(s);
    }

    const days = Object.keys(byDay).sort();
    const chartData = days.map(day => {
      const daySessions = byDay[day];
      // Compute: of all "Certain" answers, what % were correct?
      let certainTotal = 0;
      let certainCorrect = 0;
      for (const s of daySessions) {
        certainCorrect += s.confidenceMatrix.mastered;
        certainTotal += s.confidenceMatrix.mastered + s.confidenceMatrix.misconception;
      }
      const calibration = certainTotal > 0
        ? Math.round((certainCorrect / certainTotal) * 100)
        : null;

      return {
        date: day,
        dateLabel: formatShortDate(day),
        calibration,
      };
    }).filter(d => d.calibration !== null);

    const latestCalibration = chartData.length > 0
      ? chartData[chartData.length - 1].calibration
      : null;

    return { chartData, latestCalibration };
  }, [sessions]);

  return (
    <div
      className="rounded-xl border p-4 md:p-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
        Confidence Calibration
      </h3>
      <p className="text-xs mb-2" style={{ color: 'var(--foreground-secondary)' }}>
        Percentage of &quot;Certain&quot; answers that were actually correct. Target: 90%.
      </p>

      {latestCalibration !== null && latestCalibration < 70 && (
        <div
          className="flex items-start gap-2 rounded-lg p-3 mb-4 text-xs"
          style={{
            background: 'color-mix(in srgb, #ef4444 10%, transparent)',
            border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
            color: '#ef4444',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Your confidence is miscalibrated - you are certain but wrong too often.
            Review questions where you felt confident but answered incorrectly.
          </span>
        </div>
      )}

      {chartData.length < 2 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--foreground-secondary)' }}>
          Need more sessions with &quot;Certain&quot; confidence responses to show calibration trends.
        </p>
      ) : (
        <div className="w-full h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                }}
                formatter={(value) => [`${value}%`, 'Calibration']}
              />
              {/* 90% Target */}
              <ReferenceLine
                y={90}
                stroke="var(--accent-success)"
                strokeDasharray="5 5"
                label={{ value: '90% Target', position: 'right', fill: 'var(--accent-success)', fontSize: 10 }}
              />
              {/* 70% Warning threshold */}
              <ReferenceLine
                y={70}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: '70% Warning', position: 'right', fill: '#ef4444', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="calibration"
                stroke="var(--accent-secondary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent-secondary)' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ===== D. Subject Progression ===== */

function SubjectProgressionSection({ sessions }: { sessions: AnalyticsSession[] }) {
  const progressionData = useMemo(() => {
    const subjectProgression = computeSubjectProgression(sessions);

    // For each subject, get the last 10 data points and determine trend
    const entries: Array<{
      subject: string;
      data: number[];
      latestAccuracy: number;
      trend: 'improving' | 'declining' | 'stable';
    }> = [];

    for (const [subject, points] of Object.entries(subjectProgression)) {
      if (points.length < 2) continue;
      const last10 = points.slice(-10);
      const values = last10.map(p => p.value);
      const latestAccuracy = values[values.length - 1];

      // Determine trend: compare first half vs second half
      const mid = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, mid);
      const secondHalf = values.slice(mid);
      const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (avgSecond - avgFirst > 5) trend = 'improving';
      else if (avgFirst - avgSecond > 5) trend = 'declining';

      entries.push({ subject, data: values, latestAccuracy, trend });
    }

    // Sort by "needs most improvement" (lowest accuracy first)
    entries.sort((a, b) => a.latestAccuracy - b.latestAccuracy);

    return entries;
  }, [sessions]);

  if (progressionData.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Complete subject-specific sessions to see per-subject progression sparklines.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 md:p-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
        Subject Progression
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
        Accuracy over last 10 sessions per subject. Sorted by needs most improvement.
      </p>

      <div className="space-y-3">
        {progressionData.map(({ subject, data, latestAccuracy, trend }) => (
          <div
            key={subject}
            className="flex items-center gap-3 rounded-lg p-3"
            style={{
              background: 'color-mix(in srgb, var(--card-border) 30%, transparent)',
            }}
          >
            {/* Trend arrow */}
            <div className="shrink-0">
              {trend === 'improving' && (
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
              )}
              {trend === 'declining' && (
                <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
              )}
              {trend === 'stable' && (
                <Minus className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
              )}
            </div>

            {/* Subject name + accuracy */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--foreground)' }}
                >
                  {subject}
                </span>
                <span
                  className="text-sm font-semibold shrink-0"
                  style={{
                    color: latestAccuracy >= 72
                      ? 'var(--accent-success)'
                      : latestAccuracy >= 50
                        ? 'var(--accent-secondary)'
                        : '#ef4444',
                  }}
                >
                  {latestAccuracy}%
                </span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="shrink-0">
              <Sparkline
                data={data}
                width={100}
                height={30}
                color={
                  trend === 'improving'
                    ? 'var(--accent-success)'
                    : trend === 'declining'
                      ? '#ef4444'
                      : 'var(--foreground-secondary)'
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Helper components ===== */

function ToggleChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
      style={{
        color: active ? '#fff' : color,
        background: active ? color : `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid ${active ? color : `color-mix(in srgb, ${color} 30%, transparent)`}`,
        opacity: active ? 1 : 0.7,
      }}
    >
      {label}
    </button>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
