'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { getAttemptById } from '../utils/attempt-storage';
import { ErrorAnalysisPanel } from './error-analysis-panel';
import { ConfidenceCalibration } from './confidence-calibration';
import type { PracticeAttempt, ModuleResult } from '../types/attempt';

interface AttemptDashboardProps {
  attemptId: string;
}

type DashboardTab = 'overview' | 'errors' | 'confidence';

function ScoreRing({ score, size = 160, label }: { score: number; size?: number; label?: string }) {
  const strokeWidth = size >= 100 ? 12 : 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'var(--accent-success)' : score >= 60 ? 'var(--accent-secondary)' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold" style={{ color, fontSize: size >= 100 ? '2rem' : '1rem' }}>
          {Math.round(score)}%
        </span>
        {label && (
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{label}</span>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const styles = {
    High: { bg: 'rgba(0, 132, 61, 0.15)', color: 'var(--accent-success)', text: 'High Confidence' },
    Medium: { bg: 'rgba(197, 162, 88, 0.15)', color: 'var(--accent-secondary)', text: 'Medium Confidence' },
    Low: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', text: 'Low Confidence' },
  };
  const style = styles[level];

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.text}
    </span>
  );
}

function ModuleCard({ module }: { module: ModuleResult }) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-300 hover:shadow-md"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={module.percentage} size={64} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
            {module.moduleName}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            {module.score}/{module.total}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            <Clock className="h-3 w-3" />
            <span>{module.avgTimePerQuestion}s avg</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicBar({ topic, correct, total }: { topic: string; correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const barColor = pct >= 80 ? 'var(--accent-success)' : pct >= 60 ? 'var(--accent-secondary)' : '#ef4444';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--foreground)' }}>{topic}</span>
        <span className="font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          {correct}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function AttemptDashboard({ attemptId }: AttemptDashboardProps) {
  const [attempt] = useState<PracticeAttempt | null>(() => getAttemptById(attemptId));
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  if (!attempt) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Attempt not found.</p>
      </div>
    );
  }

  const sortedModules = [...attempt.moduleResults].sort((a, b) => a.percentage - b.percentage);
  const strengths = attempt.moduleResults.filter(m => m.percentage >= 80);
  const weaknesses = attempt.moduleResults.filter(m => m.percentage < 70);

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'errors', label: 'Error Analysis' },
    { id: 'confidence', label: 'Confidence' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 pb-12 md:p-6">
      {/* Back link */}
      <Link
        href="/questions/attempts"
        className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--accent-secondary)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attempts
      </Link>

      {/* Hero Section */}
      <div
        className="rounded-2xl p-6 md:p-8"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <ScoreRing score={attempt.overallPercentage} size={160} label="Overall" />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              {attempt.subjectName}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Attempt #{attempt.attemptNumber}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <ConfidenceBadge level={attempt.confidenceLevel} />
              <span className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                <Clock className="h-4 w-4" />
                {attempt.avgTimePerQuestion}s avg/question
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {attempt.overallScore}/{attempt.overallTotal} correct
              </span>
            </div>
            <div className="mt-4">
              <Link
                href={`/questions/attempts/${attemptId}/review`}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-secondary)',
                }}
              >
                Review Questions
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Module Grid */}
          <div>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Module Performance
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {attempt.moduleResults.map(module => (
                <ModuleCard key={module.moduleId} module={module} />
              ))}
            </div>
          </div>

          {/* Topic Breakdown */}
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Topic Accuracy (Sorted by Performance)
            </h2>
            <div className="space-y-4">
              {sortedModules.map(module => (
                <TopicBar
                  key={module.moduleId}
                  topic={module.moduleName}
                  correct={module.score}
                  total={module.total}
                />
              ))}
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Strengths */}
            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: 'var(--accent-success)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Strengths ({'\u2265'}80%)
                </h3>
              </div>
              {strengths.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  No modules above 80% yet. Keep practicing!
                </p>
              ) : (
                <div className="space-y-2">
                  {strengths
                    .sort((a, b) => b.percentage - a.percentage)
                    .map(m => (
                      <div key={m.moduleId} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                          {m.moduleName}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--accent-success)' }}>
                          {m.percentage}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Weaknesses */}
            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" style={{ color: '#ef4444' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Weaknesses (&lt;70%)
                </h3>
              </div>
              {weaknesses.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  No modules below 70%. Great work!
                </p>
              ) : (
                <div className="space-y-2">
                  {weaknesses
                    .sort((a, b) => a.percentage - b.percentage)
                    .map(m => (
                      <div key={m.moduleId} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                          {m.moduleName}
                        </span>
                        <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
                          {m.percentage}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <ErrorAnalysisPanel attempt={attempt} />
      )}

      {activeTab === 'confidence' && (
        <ConfidenceCalibration attempt={attempt} />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/questions/attempts"
          className="flex-1 rounded-xl px-6 py-3 text-center text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          All Attempts
        </Link>
        <Link
          href={`/questions/attempts/${attemptId}/review`}
          className="flex-1 rounded-xl px-6 py-3 text-center text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-secondary)',
          }}
        >
          Review All Questions
        </Link>
      </div>
    </div>
  );
}
