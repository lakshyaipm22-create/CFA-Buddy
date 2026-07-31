'use client';

import dynamic from 'next/dynamic';
import type { PracticeAttempt } from '../types/attempt';
import type { ErrorClassification } from '../types';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });

// Reuse the same ERROR_COLORS from mistake-analytics.tsx
const ERROR_COLORS: Record<string, string> = {
  DidntKnow: '#ef4444',
  ForgotFormula: '#f97316',
  CalculationMistake: '#eab308',
  MisreadQuestion: '#8b5cf6',
  Careless: '#06b6d4',
  TimePressure: '#ec4899',
  Unclassified: '#6b7280',
};

const ERROR_LABELS: Record<ErrorClassification, string> = {
  DidntKnow: "Didn't Know",
  ForgotFormula: 'Forgot Formula',
  CalculationMistake: 'Calculation Mistake',
  MisreadQuestion: 'Misread Question',
  Careless: 'Careless',
  TimePressure: 'Time Pressure',
  Unclassified: 'Unclassified',
};

const RECOMMENDATIONS: Record<ErrorClassification, string> = {
  DidntKnow: 'Focus on studying unfamiliar material. Add these topics to your review queue.',
  ForgotFormula: 'Create a formula sheet and practice spaced repetition on key formulas.',
  CalculationMistake: 'Slow down on calculations. Consider double-checking arithmetic steps.',
  MisreadQuestion: 'Read each question twice before answering. Underline key words.',
  Careless: 'Build a review habit - check your answer before moving to the next question.',
  TimePressure: 'Practice under timed conditions. Focus on speed for easier questions.',
  Unclassified: 'Classify your errors to unlock personalized recommendations.',
};

interface ErrorAnalysisPanelProps {
  attempt: PracticeAttempt;
}

export function ErrorAnalysisPanel({ attempt }: ErrorAnalysisPanelProps) {
  // Collect all incorrect questions with their classifications
  const incorrectQuestions = attempt.moduleResults.flatMap(m =>
    m.questionAttempts
      .filter(qa => !qa.correct)
      .map(qa => ({
        ...qa,
        moduleName: m.moduleName,
      }))
  );

  if (incorrectQuestions.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          No incorrect answers to analyze. Great job!
        </p>
      </div>
    );
  }

  // Build classification counts for pie chart
  const classificationCounts: Record<string, number> = {};
  for (const q of incorrectQuestions) {
    const cls = q.errorClassification ?? 'Unclassified';
    classificationCounts[cls] = (classificationCounts[cls] ?? 0) + 1;
  }

  const pieData = Object.entries(classificationCounts).map(([key, value]) => ({
    name: ERROR_LABELS[key as ErrorClassification] ?? key,
    value,
    key,
  }));

  // Build module-level error breakdown for stacked bar chart
  const moduleErrorMap: Record<string, Record<string, number>> = {};
  for (const q of incorrectQuestions) {
    if (!moduleErrorMap[q.moduleName]) {
      moduleErrorMap[q.moduleName] = {};
    }
    const cls = q.errorClassification ?? 'Unclassified';
    moduleErrorMap[q.moduleName][cls] = (moduleErrorMap[q.moduleName][cls] ?? 0) + 1;
  }

  const barData = Object.entries(moduleErrorMap).map(([moduleName, errors]) => ({
    module: moduleName.length > 20 ? moduleName.slice(0, 18) + '...' : moduleName,
    ...errors,
  }));

  const activeKeys = Object.keys(classificationCounts);

  // Find top pattern
  const topPattern = Object.entries(classificationCounts).sort((a, b) => b[1] - a[1])[0];
  const topErrorType = topPattern ? (topPattern[0] as ErrorClassification) : 'Unclassified';
  const topCount = topPattern ? topPattern[1] : 0;
  const topPercentage = incorrectQuestions.length > 0
    ? Math.round((topCount / incorrectQuestions.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Pattern Callout */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: 'rgba(197, 162, 88, 0.08)',
          border: '1px solid var(--accent-primary)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: ERROR_COLORS[topErrorType] ?? '#6b7280' }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Top Pattern: {ERROR_LABELS[topErrorType]} ({topPercentage}% of errors)
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {RECOMMENDATIONS[topErrorType]}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Donut Chart - Error Distribution */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <p className="mb-3 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
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
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: 'var(--foreground-secondary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked Bar Chart - Errors by Module */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <p className="mb-3 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            Error Types by Module
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis
                dataKey="module"
                tick={{ fontSize: 9, fill: 'var(--foreground-secondary)' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
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
              />
              {activeKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="errors"
                  fill={ERROR_COLORS[key] ?? '#6b7280'}
                  radius={i === activeKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  name={ERROR_LABELS[key as ErrorClassification] ?? key}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
