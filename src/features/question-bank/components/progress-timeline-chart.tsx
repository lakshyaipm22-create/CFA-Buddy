'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PracticeAttempt } from '../types/attempt';
import {
  buildProgressTimeline,
  computeTrendLine,
  predictScoreAtDate,
  computeImprovementVelocity,
} from '../utils/progress-timeline';
import { getExamDate } from '../utils/target-storage';

const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(m => m.ReferenceLine), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Dot = dynamic(() => import('recharts').then(m => m.Dot), { ssr: false });

interface ProgressTimelineChartProps {
  attempts: PracticeAttempt[];
}

const MILESTONE_THRESHOLDS = [60, 70, 80];

export function ProgressTimelineChart({ attempts }: ProgressTimelineChartProps) {
  const [examDate] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = getExamDate();
    if (stored) return stored;
    // Default: 90 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 90);
    return defaultDate.toISOString().split('T')[0];
  });

  const { chartData, velocity, predictedScore, milestones } = useMemo(() => {
    const timeline = buildProgressTimeline(attempts);
    if (timeline.length === 0) {
      return { chartData: [], velocity: 0, predictedScore: 0, trend: { slope: 0, intercept: 0, r2: 0 }, milestones: [] };
    }

    const trendResult = computeTrendLine(timeline);
    const vel = computeImprovementVelocity(timeline);
    const predicted = examDate ? predictScoreAtDate(timeline, examDate) : 0;

    // Build chart data with trend values
    const firstTime = new Date(timeline[0].date).getTime();
    const formatted = timeline.map(entry => {
      const daysDiff = (new Date(entry.date).getTime() - firstTime) / (1000 * 60 * 60 * 24);
      const trendValue = Math.max(0, Math.min(100, trendResult.slope * daysDiff + trendResult.intercept));
      return {
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: entry.percentage,
        trend: Math.round(trendValue * 10) / 10,
        subjectName: entry.subjectName,
      };
    });

    // Find milestones crossed
    const crossed: { threshold: number; date: string }[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      const crossing = timeline.find((entry, idx) => {
        if (idx === 0) return entry.percentage >= threshold;
        return entry.percentage >= threshold && timeline[idx - 1].percentage < threshold;
      });
      if (crossing) {
        crossed.push({
          threshold,
          date: new Date(crossing.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }
    }

    return { chartData: formatted, velocity: vel, predictedScore: predicted, trend: trendResult, milestones: crossed };
  }, [attempts, examDate]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Progress Timeline
        </h3>
        <div className="flex items-center gap-3">
          {/* Velocity Badge */}
          <VelocityBadge velocity={velocity} />
          {/* Predicted Score */}
          {examDate && predictedScore > 0 && (
            <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
              Projected at exam: <strong style={{ color: '#C5A258' }}>{predictedScore}%</strong>
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C5A258" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C5A258" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
          />
          {/* Milestone reference lines */}
          {MILESTONE_THRESHOLDS.map(threshold => (
            <ReferenceLine
              key={threshold}
              y={threshold}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="3 3"
              label={{ value: `${threshold}%`, position: 'right', fontSize: 9, fill: 'var(--foreground-secondary)' }}
            />
          ))}
          {/* Trend line (dashed) */}
          <Area
            type="linear"
            dataKey="trend"
            stroke="#C5A258"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
            fill="none"
            dot={false}
            name="Trend"
          />
          {/* Actual scores */}
          <Area
            type="monotone"
            dataKey="percentage"
            stroke="#C5A258"
            strokeWidth={2}
            fill="url(#goldGradient)"
            dot={<CustomDot milestones={milestones} />}
            name="Score"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {milestones.map(m => (
            <span
              key={m.threshold}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0, 132, 61, 0.15)', color: '#00843D' }}
            >
              {m.threshold}% reached on {m.date}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function VelocityBadge({ velocity }: { velocity: number }) {
  if (velocity === 0) {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
        <Minus className="h-3 w-3" />
        0% per week
      </span>
    );
  }

  const isPositive = velocity > 0;
  const color = isPositive ? '#00843D' : '#ef4444';
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const sign = isPositive ? '+' : '';

  return (
    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: `${color}15`, color }}>
      <Icon className="h-3 w-3" />
      {sign}{velocity}% per week
    </span>
  );
}

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload, milestones } = props as {
    cx: number;
    cy: number;
    payload: { percentage: number };
    milestones: { threshold: number; date: string }[];
  };

  if (!cx || !cy) return null;

  // Check if this point crosses a milestone
  const isMilestone = milestones?.some(m => payload?.percentage >= m.threshold && payload?.percentage < m.threshold + 5);

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isMilestone ? 5 : 3}
      fill={isMilestone ? '#00843D' : '#C5A258'}
      stroke={isMilestone ? '#00843D' : '#C5A258'}
    />
  );
}
