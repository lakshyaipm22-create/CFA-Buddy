'use client';

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getAttempts } from '../utils/attempt-storage';
import type { PracticeAttempt } from '../types/attempt';

interface RetakeComparisonProps {
  subjectName: string;
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent-success)' }}>
        <ArrowUp className="h-3 w-3" />+{diff}%
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#ef4444' }}>
        <ArrowDown className="h-3 w-3" />{diff}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

const CHART_COLORS = ['#002B5C', '#C5A258', '#00843D', '#3b82f6', '#f97316'];

export function RetakeComparison({ subjectName }: RetakeComparisonProps) {
  const [attempts] = useState<PracticeAttempt[]>(() => {
    const all = getAttempts(subjectName);
    return all.sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
  });

  const chartData = useMemo(() => {
    if (attempts.length === 0) return [];

    // Get all module names from first attempt
    const moduleNames = attempts[0].moduleResults.map(m => m.moduleName);

    return moduleNames.map(moduleName => {
      const entry: Record<string, string | number> = { module: moduleName };
      attempts.forEach((attempt, idx) => {
        const moduleResult = attempt.moduleResults.find(m => m.moduleName === moduleName);
        entry[`Attempt ${idx + 1}`] = moduleResult?.percentage ?? 0;
      });
      return entry;
    });
  }, [attempts]);

  const improvements = useMemo(() => {
    if (attempts.length < 2) return [];
    const latest = attempts[attempts.length - 1];
    const previous = attempts[attempts.length - 2];

    return latest.moduleResults.map(m => {
      const prevModule = previous.moduleResults.find(pm => pm.moduleId === m.moduleId);
      const diff = prevModule ? m.percentage - prevModule.percentage : 0;
      return { name: m.moduleName, diff, current: m.percentage };
    });
  }, [attempts]);

  if (attempts.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>No attempts found for {subjectName}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attempts Table */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Attempt History
        </h2>
        <div className="space-y-3">
          {attempts.map((attempt, idx) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between rounded-lg p-3"
              style={{
                backgroundColor: 'var(--background-tertiary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-secondary)',
                  }}
                >
                  #{attempt.attemptNumber}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {attempt.overallScore}/{attempt.overallTotal} questions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                  {attempt.overallPercentage}%
                </span>
                {idx > 0 && (
                  <TrendArrow
                    current={attempt.overallPercentage}
                    previous={attempts[idx - 1].overallPercentage}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Comparison Chart */}
      {attempts.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Per-Module Comparison
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="module"
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  domain={[0, 100]}
                  label={{
                    value: '%',
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
                />
                <Legend
                  wrapperStyle={{ color: 'var(--foreground-secondary)', fontSize: 12 }}
                />
                {attempts.map((_, idx) => (
                  <Bar
                    key={`attempt-${idx}`}
                    dataKey={`Attempt ${idx + 1}`}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Improvement Highlights */}
      {improvements.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Latest Changes
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {improvements
              .sort((a, b) => b.diff - a.diff)
              .map(item => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{
                    backgroundColor: 'var(--background-tertiary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {item.current}%
                    </span>
                    {item.diff > 0 ? (
                      <span className="text-xs font-medium" style={{ color: 'var(--accent-success)' }}>
                        +{item.diff}%
                      </span>
                    ) : item.diff < 0 ? (
                      <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                        {item.diff}%
                      </span>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                        -
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
