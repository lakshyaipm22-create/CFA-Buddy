'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Eye } from 'lucide-react';
import { getAttempts } from '../utils/attempt-storage';
import { seedCorporateIssuersAttempt } from '../utils/seed-corporate-issuers';
import { seedFsaAttempt } from '../utils/seed-fsa';
import { seedPortfolioManagementAttempt } from '../utils/seed-portfolio-management';
import type { PracticeAttempt } from '../types/attempt';

function ScoreRingTiny({ score }: { score: number }) {
  const size = 40;
  const strokeWidth = 4;
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
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>
        {Math.round(score)}%
      </span>
    </div>
  );
}

export function RecentAttemptsSection() {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);

  useEffect(() => {
    seedCorporateIssuersAttempt();
    seedFsaAttempt();
    seedPortfolioManagementAttempt();
    const all = getAttempts('Corporate Issuers');
    setAttempts(
      all.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 3)
    );
  }, []);

  if (attempts.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Practice Attempts
        </h2>
        <Link
          href="/questions/attempts"
          className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {attempts.map(attempt => (
          <div
            key={attempt.id}
            className="flex items-center gap-3 rounded-lg p-3 transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--background-tertiary)',
              border: '1px solid var(--border)',
            }}
          >
            <ScoreRingTiny score={attempt.overallPercentage} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {attempt.subjectName} #{attempt.attemptNumber}
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                <Clock className="h-3 w-3" />
                {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                <span>{attempt.overallScore}/{attempt.overallTotal}</span>
              </div>
            </div>
            <Link
              href={`/questions/attempts/${attempt.id}`}
              className="rounded-lg p-2 transition-all hover:opacity-80"
              style={{ color: 'var(--accent-secondary)' }}
            >
              <Eye className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
