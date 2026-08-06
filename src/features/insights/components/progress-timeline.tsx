'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';

const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

interface MonthlyDataPoint {
  month: string;
  accuracy: number;
  attempts: number;
}

interface ProgressTimelineProps {
  /** Optional: pass attempts directly. If not provided, reads from localStorage. */
  attempts?: PracticeAttempt[];
}

function loadAttempts(): PracticeAttempt[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('cfa-buddy-attempts');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PracticeAttempt[];
  } catch {
    return [];
  }
}

function computeMonthlyData(attempts: PracticeAttempt[]): MonthlyDataPoint[] {
  if (attempts.length === 0) return [];

  // Group by month (last 12 months)
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    months.push({ key, label });
  }

  const grouped: Record<string, { totalScore: number; totalQuestions: number; count: number }> = {};
  for (const m of months) {
    grouped[m.key] = { totalScore: 0, totalQuestions: 0, count: 0 };
  }

  for (const attempt of attempts) {
    const date = new Date(attempt.completedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (grouped[key]) {
      grouped[key].totalScore += attempt.overallScore;
      grouped[key].totalQuestions += attempt.overallTotal;
      grouped[key].count += 1;
    }
  }

  return months.map(m => {
    const data = grouped[m.key];
    const accuracy = data.totalQuestions > 0
      ? Math.round((data.totalScore / data.totalQuestions) * 100)
      : 0;
    return {
      month: m.label,
      accuracy,
      attempts: data.count,
    };
  });
}

function computeTrend(data: MonthlyDataPoint[]): 'improving' | 'declining' | 'stable' {
  const nonZero = data.filter(d => d.accuracy > 0);
  if (nonZero.length < 2) return 'stable';

  const midpoint = Math.ceil(nonZero.length / 2);
  const firstHalf = nonZero.slice(0, midpoint);
  const secondHalf = nonZero.slice(midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return 'stable';

  const avgFirst = firstHalf.reduce((s, d) => s + d.accuracy, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, d) => s + d.accuracy, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;

  if (diff > 3) return 'improving';
  if (diff < -3) return 'declining';
  return 'stable';
}

export function ProgressTimeline({ attempts: propAttempts }: ProgressTimelineProps) {
  const [attempts] = useState<PracticeAttempt[]>(() => propAttempts ?? loadAttempts());

  const { monthlyData, trend } = useMemo(() => {
    const data = computeMonthlyData(attempts);
    const trendDirection = computeTrend(data);
    return { monthlyData: data, trend: trendDirection };
  }, [attempts]);

  const hasData = monthlyData.some(d => d.accuracy > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--card-border)' }}>
        <Calendar className="mx-auto h-10 w-10 opacity-30" style={{ color: 'var(--foreground-secondary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Complete practice sessions to see your monthly accuracy trend.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Monthly Accuracy Trend (12 Months)
        </h3>
        <TrendIndicator trend={trend} />
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C5A258" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C5A258" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
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
            formatter={(val) => [`${val}%`, 'Accuracy']}
          />
          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="#C5A258"
            strokeWidth={2}
            fill="url(#progressGradient)"
            dot={{ fill: '#C5A258', r: 3 }}
            activeDot={{ r: 5, fill: '#C5A258' }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(0, 132, 61, 0.15)', color: '#00843D' }}>
        <TrendingUp className="h-3 w-3" />
        Improving
      </span>
    );
  }
  if (trend === 'declining') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
        <TrendingDown className="h-3 w-3" />
        Declining
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
      <Minus className="h-3 w-3" />
      Stable
    </span>
  );
}
