'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { getAllAttempts } from '../utils/attempt-storage';
import type { PracticeAttempt } from '../types/attempt';

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

interface AttemptComparisonProps {
  /** Optional filter by subject name. If not provided, shows all subjects. */
  subjectFilter?: string;
}

interface ChartDataPoint {
  attemptNumber: number;
  accuracy: number;
  label: string;
}

export function AttemptComparison({ subjectFilter }: AttemptComparisonProps) {
  const [attempts] = useState<PracticeAttempt[]>(() => getAllAttempts());

  const subjects = useMemo(() => {
    const subjectSet = new Set(attempts.map(a => a.subjectName));
    return Array.from(subjectSet).sort();
  }, [attempts]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (subjectFilter) return subjectFilter;
    return subjects[0] ?? '';
  });

  const { chartData, trend } = useMemo(() => {
    if (!selectedSubject) return { chartData: [], trend: 'stable' as const };

    const subjectAttempts = attempts
      .filter(a => a.subjectName === selectedSubject)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    if (subjectAttempts.length === 0) return { chartData: [], trend: 'stable' as const };

    const data: ChartDataPoint[] = subjectAttempts.map((a, idx) => ({
      attemptNumber: idx + 1,
      accuracy: a.overallPercentage,
      label: `Attempt ${idx + 1}`,
    }));

    // Determine trend from first and last values
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (data.length >= 2) {
      const firstHalf = data.slice(0, Math.ceil(data.length / 2));
      const secondHalf = data.slice(Math.ceil(data.length / 2));
      const avgFirst = firstHalf.reduce((sum, d) => sum + d.accuracy, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, d) => sum + d.accuracy, 0) / secondHalf.length;
      const diff = avgSecond - avgFirst;
      if (diff > 3) trendDirection = 'improving';
      else if (diff < -3) trendDirection = 'declining';
    }

    return { chartData: data, trend: trendDirection };
  }, [attempts, selectedSubject]);

  if (attempts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--card-border)' }}>
        <BarChart3 className="mx-auto h-10 w-10 opacity-30" style={{ color: 'var(--foreground-secondary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Complete multiple attempts on the same subject to see your accuracy progression.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Attempt-over-Attempt Comparison
        </h3>
        <TrendBadge trend={trend} />
      </div>

      {/* Subject selector */}
      {!subjectFilter && subjects.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)',
            }}
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {chartData.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: 'var(--foreground-secondary)' }}>
          No attempts found for this subject.
        </p>
      ) : chartData.length === 1 ? (
        <div className="py-6 text-center">
          <p className="text-2xl font-bold" style={{ color: '#C5A258' }}>{chartData[0].accuracy}%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
            Only one attempt recorded. Complete more to see your progression.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="attemptNumber"
              tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Attempt #', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'var(--foreground-secondary)' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={30}
              label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--foreground-secondary)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(val) => `Attempt ${val}`}
              formatter={(val) => [`${val}%`, 'Accuracy']}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#C5A258"
              strokeWidth={2}
              dot={{ fill: '#C5A258', r: 4 }}
              activeDot={{ r: 6, fill: '#C5A258' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
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
