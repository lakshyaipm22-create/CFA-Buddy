'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ErrorClassification } from '@/features/question-bank/types';

// Chart colors for error classifications
const ERROR_COLORS: Record<string, string> = {
  DidntKnow: '#ef4444',
  ForgotFormula: '#f97316',
  CalculationMistake: '#eab308',
  MisreadQuestion: '#8b5cf6',
  Careless: '#06b6d4',
  TimePressure: '#ec4899',
  Unclassified: '#6b7280',
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  DidntKnow: "Didn't Know",
  ForgotFormula: 'Forgot Formula',
  CalculationMistake: 'Calculation Error',
  MisreadQuestion: 'Misread Question',
  Careless: 'Careless',
  TimePressure: 'Time Pressure',
  Unclassified: 'Unclassified',
};

interface WeekData {
  week: string;
  [key: string]: string | number;
}

interface MistakeEntry {
  classification: string;
  timestamp: string;
  questionId: string;
  confidence?: string;
}

interface ErrorAnalyticsProps {
  mistakes: MistakeEntry[];
}

function getWeekLabel(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / 86400000
  );
  const weekNum = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  return `W${weekNum}`;
}

function buildWeeklyTrends(mistakes: MistakeEntry[]): WeekData[] {
  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 86400000);

  const weeks: WeekData[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 86400000);
    weeks.push({
      week: getWeekLabel(weekStart),
      DidntKnow: 0,
      ForgotFormula: 0,
      CalculationMistake: 0,
      MisreadQuestion: 0,
      Careless: 0,
      TimePressure: 0,
      Unclassified: 0,
    });
  }

  for (const m of mistakes) {
    const ts = new Date(m.timestamp);
    if (ts < twelveWeeksAgo) continue;

    const weeksAgo = Math.floor(
      (now.getTime() - ts.getTime()) / (7 * 86400000)
    );
    const weekIdx = 11 - Math.min(weeksAgo, 11);
    const key = m.classification as ErrorClassification;

    if (key in (weeks[weekIdx] as Record<string, unknown>)) {
      (weeks[weekIdx][key] as number) += 1;
      weeks[weekIdx] = { ...weeks[weekIdx], [key]: (weeks[weekIdx][key] as number) };
    } else {
      weeks[weekIdx] = {
        ...weeks[weekIdx],
        Unclassified: (weeks[weekIdx].Unclassified as number) + 1,
      };
    }
  }

  return weeks;
}

export function ErrorAnalytics({ mistakes }: ErrorAnalyticsProps) {
  if (mistakes.length === 0) {
    return null;
  }

  // Build classification breakdown for donut chart
  const classificationCounts = mistakes.reduce(
    (acc, m) => {
      acc[m.classification] = (acc[m.classification] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(classificationCounts).map(([name, value]) => ({
    name: CLASSIFICATION_LABELS[name] || name.replace(/([A-Z])/g, ' $1').trim(),
    value,
    key: name,
  }));

  // Build weekly trends
  const weeklyData = buildWeeklyTrends(mistakes);

  // Misconception ratio: repeat errors (same questionId appearing > 1 time)
  const questionCounts = mistakes.reduce(
    (acc, m) => {
      acc[m.questionId] = (acc[m.questionId] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const repeatErrors = Object.values(questionCounts).filter((c) => c > 1).length;
  const totalUniqueQuestions = Object.keys(questionCounts).length;
  const misconceptionRatio =
    totalUniqueQuestions > 0
      ? ((repeatErrors / totalUniqueQuestions) * 100).toFixed(1)
      : '0.0';

  // Active classification keys
  const activeKeys = Object.keys(classificationCounts);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          Error Pattern Analytics
        </h3>
        <div className="flex items-center gap-3">
          <div
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
            }}
          >
            Repeat Errors: {repeatErrors}
          </div>
          <div
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-secondary)',
            }}
          >
            Misconception Ratio: {misconceptionRatio}%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Error Breakdown Donut Chart */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
          }}
        >
          <p
            className="mb-3 text-xs font-medium"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Error Type Distribution
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={2}
                stroke="none"
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={ERROR_COLORS[entry.key] ?? '#6b7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground-secondary)' }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '11px',
                  color: 'var(--foreground-secondary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trends Stacked Bar Chart */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
          }}
        >
          <p
            className="mb-3 text-xs font-medium"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Weekly Error Trends (12 Weeks)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} stackOffset="none">
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--foreground-secondary)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground-secondary)' }}
              />
              {activeKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="errors"
                  fill={ERROR_COLORS[key] ?? '#6b7280'}
                  radius={
                    i === activeKeys.length - 1
                      ? [2, 2, 0, 0]
                      : [0, 0, 0, 0]
                  }
                  name={CLASSIFICATION_LABELS[key] || key}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
