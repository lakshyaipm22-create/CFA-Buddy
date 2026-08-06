'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { useLocalStorageSessions } from '@/features/dashboard/hooks/use-local-storage-sessions';

interface TopicStats {
  subject: string;
  reading: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface TooltipData {
  subject: string;
  reading: string;
  accuracy: number;
  correct: number;
  total: number;
  x: number;
  y: number;
}

function getCellColor(accuracy: number, attempted: boolean): string {
  if (!attempted) return 'var(--nav-hover-bg)';
  if (accuracy >= 70) return '#00843D';
  if (accuracy >= 40) return '#C5A258';
  return '#ef4444';
}

export function TopicHeatmap() {
  const router = useRouter();
  const sessions = useLocalStorageSessions();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const topicData = useMemo(() => {
    // Load all questions and get unique readings per subject
    const allQuestions = loadAllQuestions();

    const readingsBySubject: Record<string, string[]> = {};
    for (const subject of CFA_SUBJECTS_ORDERED) {
      const readings = new Set<string>();
      for (const q of allQuestions) {
        if (q.subject === subject && q.reading) {
          readings.add(q.reading);
        }
      }
      readingsBySubject[subject] = [...readings].sort();
    }

    // Compute accuracy per subject/reading from session attempts
    const completed = sessions.filter(s => s.status === 'completed');
    const statsMap: Record<string, TopicStats> = {};

    // Build a lookup map for O(1) question resolution instead of O(n) find per attempt
    const questionMap = new Map<string, { subject: string; reading: string | null }>();
    for (const q of allQuestions) {
      questionMap.set(q.id, { subject: q.subject, reading: q.reading });
    }

    for (const session of completed) {
      for (const attempt of session.attempts ?? []) {
        if (!attempt.questionId) continue;
        const q = questionMap.get(attempt.questionId);
        if (!q || !q.reading) continue;
        const key = `${q.subject}|||${q.reading}`;
        if (!statsMap[key]) {
          statsMap[key] = { subject: q.subject, reading: q.reading, correct: 0, total: 0, accuracy: 0 };
        }
        statsMap[key].total++;
        if (attempt.correct) statsMap[key].correct++;
      }
    }

    // Calculate accuracy
    for (const stat of Object.values(statsMap)) {
      stat.accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    }

    return { readingsBySubject, statsMap };
  }, [sessions]);

  const handleCellClick = useCallback((subject: string, reading: string) => {
    const params = new URLSearchParams({ subject, topic: reading });
    router.push(`/practice?${params.toString()}`);
  }, [router]);

  const handleMouseEnter = useCallback((
    e: React.MouseEvent,
    subject: string,
    reading: string,
    stats: TopicStats | undefined
  ) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      subject,
      reading,
      accuracy: stats?.accuracy ?? 0,
      correct: stats?.correct ?? 0,
      total: stats?.total ?? 0,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const { readingsBySubject, statsMap } = topicData;

  // Find max topic count for grid sizing
  const maxTopics = Math.max(...Object.values(readingsBySubject).map(r => r.length), 1);

  if (maxTopics === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--card-border)' }}>
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          No topic data available yet. Complete some sessions to see your heatmap.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border px-3 py-2 text-xs shadow-lg pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--foreground)',
          }}
        >
          <p className="font-semibold">{tooltip.subject}</p>
          <p style={{ color: 'var(--foreground-secondary)' }}>
            {tooltip.reading}: {tooltip.total > 0 ? `${tooltip.accuracy}% (${tooltip.correct}/${tooltip.total} correct)` : 'Not attempted'}
          </p>
        </div>
      )}

      {/* Heatmap Grid */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <div className="min-w-[600px]">
          {CFA_SUBJECTS_ORDERED.map((subject) => {
            const readings = readingsBySubject[subject] ?? [];
            if (readings.length === 0) return null;

            return (
              <div key={subject} className="flex items-stretch border-b last:border-b-0" style={{ borderColor: 'var(--card-border)' }}>
                {/* Subject label - sticky on mobile */}
                <div
                  className="sticky left-0 z-10 flex w-40 min-w-[160px] shrink-0 items-center px-3 py-2 text-xs font-medium"
                  style={{ background: 'var(--card-bg)', color: 'var(--foreground)', borderRight: '1px solid var(--card-border)' }}
                >
                  <span className="truncate">{subject}</span>
                </div>

                {/* Topic cells */}
                <div className="flex flex-1 flex-wrap gap-1 p-2">
                  {readings.map((reading) => {
                    const key = `${subject}|||${reading}`;
                    const stats = statsMap[key];
                    const attempted = stats !== undefined && stats.total > 0;
                    const color = getCellColor(stats?.accuracy ?? 0, attempted);

                    return (
                      <button
                        key={reading}
                        className="h-7 w-7 rounded transition-all hover:scale-125 hover:ring-2 hover:ring-white/30 cursor-pointer"
                        style={{ background: color }}
                        onClick={() => handleCellClick(subject, reading)}
                        onMouseEnter={(e) => handleMouseEnter(e, subject, reading, stats)}
                        onMouseLeave={handleMouseLeave}
                        aria-label={`${subject} - ${reading}: ${attempted ? `${stats.accuracy}%` : 'Not attempted'}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded" style={{ background: '#ef4444' }} />
          <span>0-40%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded" style={{ background: '#C5A258' }} />
          <span>40-70%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded" style={{ background: '#00843D' }} />
          <span>70-100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded" style={{ background: 'var(--nav-hover-bg)' }} />
          <span>Not attempted</span>
        </div>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
          Click a cell to practice that topic
        </span>
      </div>
    </div>
  );
}
