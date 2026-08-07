'use client';

import { useState, useMemo } from 'react';
import { Activity, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import type { Question } from '@/features/question-bank/types';
import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { generatePatternAnalysis } from '../utils/insight-generator';
import { PatternCard } from './pattern-card';

export function PatternDashboard() {
  const [attempts] = useState<PracticeAttempt[]>(() => getAllAttempts());
  const [questions] = useState<Question[]>(() => loadAllQuestions());

  const analysis = useMemo(
    () => generatePatternAnalysis(attempts, questions),
    [attempts, questions]
  );

  const hasPatterns = analysis.patterns.length > 0;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/mistakes"
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: '#C5A258' }}
      >
        <ArrowLeft size={14} />
        Back to Mistake Book
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: 'rgba(197, 162, 88, 0.1)' }}
          >
            <Activity size={20} style={{ color: '#C5A258' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Mistake Pattern Analysis
            </h1>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Deep analysis of your error patterns - beyond simple accuracy
            </p>
          </div>
        </div>
      </div>

      {/* Overall Insight */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Overall Assessment
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
          {analysis.overallInsight}
        </p>
        {analysis.totalAttemptsAnalyzed > 0 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.6 }}>
            Based on {analysis.totalAttemptsAnalyzed} question attempts
          </p>
        )}
      </div>

      {/* Patterns Grid */}
      {hasPatterns ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Detected Patterns ({analysis.patterns.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.patterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <Activity size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--foreground-secondary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Not enough data yet
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Complete more practice sessions to detect mistake patterns. We need at least 3 question attempts per topic for meaningful analysis.
          </p>
          <Link
            href="/questions"
            className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ background: '#C5A258', color: '#0a0e14' }}
          >
            Start Practicing
          </Link>
        </div>
      )}
    </div>
  );
}
