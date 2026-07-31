'use client';

import { useState, useEffect } from 'react';
import {
  getAllSubjectsProgress,
  formatLastStudied,
} from '@/shared/lib/subject-utils';
import type { SubjectProgress } from '@/shared/lib/subject-utils';

interface SubjectProgressIndicatorsProps {
  subjectNames: string[];
}

/**
 * Client component that renders per-subject progress indicators.
 * Reads from localStorage and renders overlays on the subject cards.
 */
export function SubjectProgressIndicators({ subjectNames }: SubjectProgressIndicatorsProps) {
  const [progressMap, setProgressMap] = useState<Map<string, SubjectProgress>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProgressMap(getAllSubjectsProgress());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {subjectNames.map((name) => {
        const progress = progressMap.get(name.toLowerCase());
        if (!progress || progress.totalQuestionsAnswered === 0) return null;

        return (
          <div
            key={name}
            data-subject-progress={name}
            className="mt-3 pt-3"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {progress.totalQuestionsAnswered} Qs done
              </span>
              <span
                className="text-xs font-semibold"
                style={{
                  color:
                    progress.accuracy >= 70
                      ? 'var(--accent-success)'
                      : progress.accuracy >= 50
                        ? 'var(--accent-secondary)'
                        : '#ef4444',
                }}
              >
                {progress.accuracy}%
              </span>
            </div>
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--nav-hover-bg)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(progress.accuracy, 100)}%`,
                  backgroundColor:
                    progress.accuracy >= 70
                      ? 'var(--accent-success)'
                      : progress.accuracy >= 50
                        ? 'var(--accent-secondary)'
                        : '#ef4444',
                }}
              />
            </div>
            <p className="mt-1 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
              Last studied: {formatLastStudied(progress.lastStudied)}
            </p>
          </div>
        );
      })}
    </>
  );
}

/**
 * Individual subject progress badge to be rendered inline inside a subject card.
 */
export function SubjectProgressBadge({ subjectName }: { subjectName: string }) {
  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const allProgress = getAllSubjectsProgress();
    const p = allProgress.get(subjectName.toLowerCase()) ?? null;
    setProgress(p);
    setMounted(true);
  }, [subjectName]);

  if (!mounted || !progress || progress.totalQuestionsAnswered === 0) return null;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {progress.totalQuestionsAnswered} Qs done
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color:
              progress.accuracy >= 70
                ? 'var(--accent-success)'
                : progress.accuracy >= 50
                  ? 'var(--accent-secondary)'
                  : '#ef4444',
          }}
        >
          {progress.accuracy}%
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--nav-hover-bg)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(progress.accuracy, 100)}%`,
            backgroundColor:
              progress.accuracy >= 70
                ? 'var(--accent-success)'
                : progress.accuracy >= 50
                  ? 'var(--accent-secondary)'
                  : '#ef4444',
          }}
        />
      </div>
      <p className="mt-1 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
        Last studied: {formatLastStudied(progress.lastStudied)}
      </p>
    </div>
  );
}
