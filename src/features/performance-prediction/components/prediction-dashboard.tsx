'use client';

import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Clock, BarChart3, Shield } from 'lucide-react';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';
import { getQuestionCountBySubject } from '@/features/question-bank/utils/question-loader';
import { computePassProbability, computeTrendData } from '../utils/prediction-engine';
import { savePredictionSnapshot, createSnapshot, loadPredictionSnapshots } from '../utils/prediction-storage';
import { computeFocusRecommendations } from '../utils/focus-recommender';
import { FocusPlan } from './focus-plan';
import type { PredictionResult, TrendDataPoint, PredictionSnapshot } from '../types';

type TrendWindow = 7 | 14 | 30;

export function PredictionDashboard() {
  const [attempts] = useState<PracticeAttempt[]>(() => getAllAttempts());
  const [trendWindow, setTrendWindow] = useState<TrendWindow>(14);

  const questionCounts = useMemo(() => getQuestionCountBySubject(), []);

  const prediction: PredictionResult = useMemo(() => {
    const result = computePassProbability(attempts, questionCounts);

    // Cache today's snapshot
    if (attempts.length > 0) {
      const overallAccuracy =
        attempts.reduce((s, a) => s + a.overallScore, 0) /
        Math.max(1, attempts.reduce((s, a) => s + a.overallTotal, 0)) * 100;
      const snapshot = createSnapshot(result.passProb, result.factors, Math.round(overallAccuracy));
      savePredictionSnapshot(snapshot);
    }

    return result;
  }, [attempts, questionCounts]);

  const trendData: TrendDataPoint[] = useMemo(
    () => computeTrendData(attempts, trendWindow),
    [attempts, trendWindow]
  );

  const snapshots: PredictionSnapshot[] = useMemo(
    () => loadPredictionSnapshots(),
    []
  );

  const recommendations = useMemo(
    () => computeFocusRecommendations(attempts, questionCounts),
    [attempts, questionCounts]
  );

  const handleWindowChange = useCallback((window: TrendWindow) => {
    setTrendWindow(window);
  }, []);

  if (attempts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Pass Probability Gauge */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
          <PassProbabilityGauge prediction={prediction} />
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <TrendIcon direction={prediction.trendDirection} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {prediction.trendDirection === 'improving'
                  ? 'Performance is improving'
                  : prediction.trendDirection === 'declining'
                    ? 'Performance is declining'
                    : 'Performance is stable'}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Confidence Interval: {prediction.confidenceInterval[0]}% - {prediction.confidenceInterval[1]}%
            </div>
            {prediction.projectedDaysToReady !== null && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Estimated {prediction.projectedDaysToReady} days to exam-ready at current pace
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Factor Breakdown
        </h3>
        <div className="space-y-3">
          {prediction.factors.map(factor => (
            <FactorBar key={factor.name} factor={factor} />
          ))}
        </div>
      </div>

      {/* Trend Line */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Accuracy Trend
          </h3>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map(w => (
              <button
                key={w}
                onClick={() => handleWindowChange(w)}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: trendWindow === w ? '#002B5C' : 'transparent',
                  color: trendWindow === w ? '#C5A258' : 'var(--foreground-secondary)',
                }}
              >
                {w}d
              </button>
            ))}
          </div>
        </div>
        <TrendChart data={trendData} snapshots={snapshots} />
      </div>

      {/* Focus Recommendations */}
      <FocusPlan recommendations={recommendations} />
    </div>
  );
}

function PassProbabilityGauge({ prediction }: { prediction: PredictionResult }) {
  const { passProb } = prediction;
  const color = passProb >= 70 ? '#00843D' : passProb >= 45 ? '#C5A258' : '#ef4444';

  // SVG circle gauge
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (passProb / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="var(--card-border)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {passProb}%
          </span>
          <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
            Pass Probability
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
        {passProb >= 70
          ? 'Strong position for exam day'
          : passProb >= 45
            ? 'Getting closer, keep studying'
            : 'More preparation needed'}
      </p>
    </div>
  );
}

function FactorBar({ factor }: { factor: { name: string; score: number; weight: number; impactDescription: string } }) {
  const barColor =
    factor.score >= 70 ? '#00843D' : factor.score >= 50 ? '#C5A258' : '#ef4444';

  const iconMap: Record<string, React.ReactNode> = {
    'Accuracy': <Target className="h-3.5 w-3.5" />,
    'Coverage': <BarChart3 className="h-3.5 w-3.5" />,
    'Consistency & Trend': <TrendingUp className="h-3.5 w-3.5" />,
    'Time Management': <Clock className="h-3.5 w-3.5" />,
    'Confidence Calibration': <Shield className="h-3.5 w-3.5" />,
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: barColor }}>{iconMap[factor.name]}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {factor.name}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
            ({Math.round(factor.weight * 100)}% weight)
          </span>
        </div>
        <span className="text-xs font-bold" style={{ color: barColor }}>
          {factor.score}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: 'var(--card-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${factor.score}%`, background: barColor }}
        />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
        {factor.impactDescription}
      </p>
    </div>
  );
}

function TrendChart({ data, snapshots }: { data: TrendDataPoint[]; snapshots: PredictionSnapshot[] }) {
  if (data.length === 0 && snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
        Not enough data for trend visualization yet. Keep practicing!
      </div>
    );
  }

  // Use accuracy data or fallback to snapshot data
  const chartData = data.length > 0 ? data : snapshots.map(s => ({
    date: s.date,
    accuracy: s.accuracy,
    questionCount: 0,
  }));

  const maxAccuracy = Math.max(...chartData.map(d => d.accuracy), 100);
  const minAccuracy = Math.min(...chartData.map(d => d.accuracy), 0);
  const range = Math.max(maxAccuracy - minAccuracy, 20);

  return (
    <div className="relative h-40 w-full">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px]" style={{ color: 'var(--foreground-secondary)' }}>
        <span>{Math.round(minAccuracy + range)}%</span>
        <span>{Math.round(minAccuracy + range / 2)}%</span>
        <span>{Math.round(minAccuracy)}%</span>
      </div>
      {/* Chart area */}
      <div className="ml-10 h-full relative">
        {/* 70% line (MPS) */}
        <div
          className="absolute left-0 right-0 border-t border-dashed"
          style={{
            top: `${100 - ((70 - minAccuracy) / range) * 100}%`,
            borderColor: 'rgba(197, 162, 88, 0.5)',
          }}
        >
          <span
            className="absolute -top-3 right-0 text-[8px]"
            style={{ color: '#C5A258' }}
          >
            70% MPS
          </span>
        </div>
        {/* Data points and line */}
        <svg className="w-full h-full" preserveAspectRatio="none">
          {chartData.length > 1 && (
            <polyline
              fill="none"
              stroke="#C5A258"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartData
                .map((d, i) => {
                  const x = (i / (chartData.length - 1)) * 100;
                  const y = 100 - ((d.accuracy - minAccuracy) / range) * 100;
                  return `${x}%,${y}%`;
                })
                .join(' ')}
            />
          )}
          {chartData.map((d, i) => {
            const x = chartData.length > 1 ? (i / (chartData.length - 1)) * 100 : 50;
            const y = 100 - ((d.accuracy - minAccuracy) / range) * 100;
            return (
              <circle
                key={d.date}
                cx={`${x}%`}
                cy={`${y}%`}
                r="4"
                fill="#C5A258"
                stroke="var(--card-bg)"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      {/* X-axis labels */}
      {chartData.length > 0 && (
        <div className="ml-10 flex justify-between mt-1 text-[8px]" style={{ color: 'var(--foreground-secondary)' }}>
          <span>{formatDate(chartData[0].date)}</span>
          {chartData.length > 2 && (
            <span>{formatDate(chartData[Math.floor(chartData.length / 2)].date)}</span>
          )}
          <span>{formatDate(chartData[chartData.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}

function TrendIcon({ direction }: { direction: string }) {
  if (direction === 'improving') {
    return <TrendingUp className="h-4 w-4" style={{ color: '#00843D' }} />;
  }
  if (direction === 'declining') {
    return <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />;
  }
  return <Minus className="h-4 w-4" style={{ color: '#C5A258' }} />;
}

function EmptyState() {
  return (
    <div
      className="rounded-xl border p-8 text-center"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <Target className="h-12 w-12 mx-auto mb-4" style={{ color: '#C5A258' }} />
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
        No Prediction Data Yet
      </h3>
      <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--foreground-secondary)' }}>
        Complete some practice sessions to generate your personalized pass probability prediction.
        The model uses accuracy, coverage, consistency, time management, and confidence calibration.
      </p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}
