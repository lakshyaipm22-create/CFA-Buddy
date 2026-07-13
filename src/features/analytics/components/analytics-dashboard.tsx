'use client';

import { useState, useMemo } from 'react';
import { BarChart3, FileQuestion } from 'lucide-react';
import { getSessions } from '@/features/question-bank/utils/session-storage';
import type { QuestionSession } from '@/features/question-bank/types';
import type { SessionFilter, SortOption, AnalyticsSession } from '../types';
import { computeSessionStats, computeAggregateStats, filterSessions, sortSessions } from '../utils/analytics-engine';
import { AggregateStatsPanel } from './aggregate-stats-panel';
import { SessionCard } from './session-card';
import { SessionFilters } from './session-filters';

export function AnalyticsDashboard() {
  // Load sessions from localStorage using lazy initializer (never useSyncExternalStore for one-time reads)
  const [rawSessions] = useState<QuestionSession[]>(() => {
    if (typeof window === 'undefined') return [];
    return getSessions().filter((s) => s.status === 'completed');
  });

  const [filter, setFilter] = useState<SessionFilter>({
    dateRange: 'all',
    subject: null,
    mode: null,
    scoreRange: 'all',
  });

  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Compute analytics for all completed sessions
  const analyticsSessions: AnalyticsSession[] = useMemo(() => {
    return rawSessions.map((session) => computeSessionStats(session));
  }, [rawSessions]);

  // Aggregate stats (before filtering)
  const aggregateStats = useMemo(() => {
    return computeAggregateStats(analyticsSessions);
  }, [analyticsSessions]);

  // Apply filters and sort
  const filteredSessions = useMemo(() => {
    const filtered = filterSessions(analyticsSessions, filter);
    return sortSessions(filtered, sortBy);
  }, [analyticsSessions, filter, sortBy]);

  // Empty state
  if (analyticsSessions.length === 0) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <FileQuestion
            className="mx-auto h-12 w-12 opacity-30"
            style={{ color: 'var(--foreground-secondary)' }}
          />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            No Test Sessions Yet
          </h3>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--foreground-secondary)' }}>
            Complete some practice sessions to see your detailed analytics here. Start by taking a
            topic test or a mock exam.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6" style={{ color: 'var(--accent-secondary)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Test Analytics
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Comprehensive breakdown of all your practice sessions
          </p>
        </div>
      </div>

      {/* Aggregate Stats Panel */}
      <AggregateStatsPanel stats={aggregateStats} />

      {/* Filters */}
      <SessionFilters
        filter={filter}
        sortBy={sortBy}
        onFilterChange={setFilter}
        onSortChange={setSortBy}
        totalResults={filteredSessions.length}
      />

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-8 text-center"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            No sessions match your current filters. Try adjusting the criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
