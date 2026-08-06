'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Eye, FileText } from 'lucide-react';
import { seedCorporateIssuersAttempt } from '../utils/seed-corporate-issuers';
import { seedFsaAttempt } from '../utils/seed-fsa';
import { seedPortfolioManagementAttempt } from '../utils/seed-portfolio-management';
import { seedQuantitativeMethodsAttempt } from '../utils/seed-quantitative-methods';
import { seedAlternativeInvestmentsAttempt } from '../utils/seed-alternative-investments';
import { runSeedsIfNeeded } from '../utils/seed-guard';
import { getAllAttempts } from '../utils/attempt-storage';
import { RetakeComparison } from './retake-comparison';
import type { PracticeAttempt } from '../types/attempt';

const ALL_SUBJECTS = ['Corporate Issuers', 'Financial Statement Analysis', 'Portfolio Management', 'Quantitative Methods', 'Alternative Investments'] as const;

function ScoreRingSmall({ score }: { score: number }) {
  const size = 48;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'var(--accent-success)' : score >= 60 ? 'var(--accent-secondary)' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
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
          style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {Math.round(score)}%
      </span>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const styles = {
    High: { bg: 'rgba(0, 132, 61, 0.15)', color: 'var(--accent-success)' },
    Medium: { bg: 'rgba(197, 162, 88, 0.15)', color: 'var(--accent-secondary)' },
    Low: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  };
  const style = styles[level];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {level}
    </span>
  );
}

export function AttemptsListClient() {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    runSeedsIfNeeded([seedCorporateIssuersAttempt, seedFsaAttempt, seedPortfolioManagementAttempt, seedQuantitativeMethodsAttempt, seedAlternativeInvestmentsAttempt]);
    setSeeded(true);
  }, []);

  useEffect(() => {
    if (seeded) {
      const all = getAllAttempts();
      setAttempts(all.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ));
    }
  }, [seeded]);

  if (attempts.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading attempts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Attempts Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {attempts.map(attempt => (
          <div
            key={attempt.id}
            className="rounded-xl p-5 transition-all duration-300 hover:shadow-md"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div className="flex items-start gap-4">
              <ScoreRingSmall score={attempt.overallPercentage} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {attempt.subjectName}
                  </h3>
                  <ConfidenceBadge level={attempt.confidenceLevel} />
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Attempt #{attempt.attemptNumber}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>{attempt.overallScore}/{attempt.overallTotal} correct</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/questions/attempts/${attempt.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    View Details
                  </Link>
                  <Link
                    href={`/questions/attempts/${attempt.id}/review`}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--background-tertiary)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <FileText className="h-3 w-3" />
                    Review
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Retake Comparison */}
      {ALL_SUBJECTS.map(subject => (
        <RetakeComparison key={subject} subjectName={subject} />
      ))}
    </div>
  );
}
