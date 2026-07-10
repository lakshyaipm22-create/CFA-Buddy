'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLocalStorageSessions } from '../hooks/use-local-storage-sessions';

interface DayPoint {
  date: string;
  accuracy: number;
}

export function AccuracyTrend() {
  const sessions = useLocalStorageSessions();

  const chartData = useMemo<DayPoint[]>(() => {
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length === 0) return [];

    // Group attempts by date
    const byDate: Record<string, { correct: number; total: number }> = {};

    for (const session of completed) {
      for (const attempt of session.attempts ?? []) {
        if (!attempt.timestamp) continue;
        const dateKey = attempt.timestamp.slice(0, 10);
        if (!byDate[dateKey]) byDate[dateKey] = { correct: 0, total: 0 };
        byDate[dateKey].total++;
        if (attempt.correct) byDate[dateKey].correct++;
      }
    }

    // Generate last 30 days
    const points: DayPoint[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const data = byDate[key];
      if (data && data.total > 0) {
        points.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          accuracy: Math.round((data.correct / data.total) * 100),
        });
      }
    }
    return points;
  }, [sessions]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Accuracy Trend (30 Days)</h3>
        <p className="mt-4 text-center text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Complete some sessions to see your accuracy over time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Accuracy Trend (30 Days)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
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
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#C5A258"
            strokeWidth={2}
            dot={{ fill: '#C5A258', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
