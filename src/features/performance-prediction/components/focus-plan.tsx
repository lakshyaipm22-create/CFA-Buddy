'use client';

import { Target, ArrowUp, BookOpen } from 'lucide-react';
import type { FocusRecommendation } from '../types';

interface FocusPlanProps {
  recommendations: FocusRecommendation[];
}

export function FocusPlan({ recommendations }: FocusPlanProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4" style={{ color: '#C5A258' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Top 5 Focus Areas
        </h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
        >
          Highest Impact
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
        Prioritized by expected score improvement per hour of study, weighted by CFA curriculum importance.
      </p>

      <div className="space-y-3">
        {recommendations.map(rec => (
          <RecommendationCard key={`${rec.subject}-${rec.topic ?? 'subject'}`} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: FocusRecommendation }) {
  const priorityColors = ['#ef4444', '#f97316', '#C5A258', '#3b82f6', '#6b7280'];
  const color = priorityColors[recommendation.priority - 1] ?? '#6b7280';

  return (
    <div
      className="rounded-lg border p-4 transition-all hover:scale-[1.01]"
      style={{ borderColor: 'var(--card-border)', background: 'var(--nav-hover-bg)' }}
    >
      <div className="flex items-start gap-3">
        {/* Priority badge */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0"
          style={{ background: `${color}22`, color }}
        >
          {recommendation.priority}
        </div>

        <div className="flex-1 min-w-0">
          {/* Subject + Topic */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              {recommendation.subject}
            </span>
            {recommendation.topic && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(0, 43, 92, 0.15)', color: '#7da5d4' }}
              >
                {recommendation.topic}
              </span>
            )}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}
            >
              {Math.round(recommendation.curriculumWeight * 100)}% exam weight
            </span>
          </div>

          {/* Reason */}
          <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
            {recommendation.reason}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" style={{ color: 'var(--foreground-secondary)' }} />
              <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                Current: {recommendation.currentAccuracy}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" style={{ color: '#00843D' }} />
              <span className="text-[10px]" style={{ color: '#00843D' }}>
                +{recommendation.expectedImpact} pts/hr expected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
