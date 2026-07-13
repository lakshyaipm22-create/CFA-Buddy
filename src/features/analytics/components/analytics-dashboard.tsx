'use client';

import { useState, useMemo, useCallback } from 'react';
import { BarChart3, FileQuestion, TrendingUp, Zap, GitCompare } from 'lucide-react';
import { getSessions } from '@/features/question-bank/utils/session-storage';
import type { QuestionSession } from '@/features/question-bank/types';
import type { SessionFilter, SortOption, AnalyticsSession } from '../types';
import { computeSessionStats, computeAggregateStats, filterSessions, sortSessions } from '../utils/analytics-engine';
import { AggregateStatsPanel } from './aggregate-stats-panel';
import { SessionCard } from './session-card';
import { SessionFilters } from './session-filters';
import { TrendCharts } from './trend-charts';
import { SmartInsights } from './smart-insights';
import { SessionComparison } from './session-comparison';

type TabId = 'sessions' | 'trends' | 'insights';

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
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

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

  // Comparison sessions
  const comparisonSessions = useMemo(() => {
    if (selectedForCompare.length !== 2) return null;
    const a = analyticsSessions.find(s => s.id === selectedForCompare[0]);
    const b = analyticsSessions.find(s => s.id === selectedForCompare[1]);
    if (!a || !b) return null;
    return { a, b };
  }, [analyticsSessions, selectedForCompare]);

  const toggleCompareSession = useCallback((sessionId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        return [prev[1], sessionId];
      }
      return [...prev, sessionId];
    });
  }, []);

  const handleCloseComparison = useCallback(() => {
    setSelectedForCompare([]);
    setCompareMode(false);
  }, []);

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

      {/* Tab Navigation */}
      <div
        className="flex items-center gap-1 rounded-xl border p-1 overflow-x-auto"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <TabButton
          label="Sessions"
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          active={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
        />
        <TabButton
          label="Trends"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          active={activeTab === 'trends'}
          onClick={() => setActiveTab('trends')}
        />
        <TabButton
          label="Insights"
          icon={<Zap className="h-3.5 w-3.5" />}
          active={activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
        />
      </div>

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Compare mode toggle + Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SessionFilters
              filter={filter}
              sortBy={sortBy}
              onFilterChange={setFilter}
              onSortChange={setSortBy}
              totalResults={filteredSessions.length}
            />
            <button
              type="button"
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) setSelectedForCompare([]);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
              style={{
                color: compareMode ? '#fff' : 'var(--accent-primary)',
                background: compareMode
                  ? 'var(--accent-primary)'
                  : 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                border: `1px solid ${compareMode ? 'var(--accent-primary)' : 'color-mix(in srgb, var(--accent-primary) 30%, transparent)'}`,
              }}
            >
              <GitCompare className="h-3.5 w-3.5" />
              {compareMode ? `Compare (${selectedForCompare.length}/2)` : 'Compare'}
            </button>
          </div>

          {/* Comparison View */}
          {comparisonSessions && (
            <SessionComparison
              sessionA={comparisonSessions.a}
              sessionB={comparisonSessions.b}
              onClose={handleCloseComparison}
            />
          )}

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
                <SessionCardWrapper
                  key={session.id}
                  session={session}
                  compareMode={compareMode}
                  isSelected={selectedForCompare.includes(session.id)}
                  onToggleCompare={toggleCompareSession}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <TrendCharts sessions={analyticsSessions} />
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <SmartInsights sessions={analyticsSessions} />
      )}
    </div>
  );
}

/* ===== Tab Button ===== */

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
      style={{
        color: active ? '#fff' : 'var(--foreground-secondary)',
        background: active ? 'var(--accent-primary)' : 'transparent',
      }}
      aria-selected={active}
      role="tab"
    >
      {icon}
      {label}
    </button>
  );
}

/* ===== Session Card Wrapper (with compare checkbox) ===== */

function SessionCardWrapper({
  session,
  compareMode,
  isSelected,
  onToggleCompare,
}: {
  session: AnalyticsSession;
  compareMode: boolean;
  isSelected: boolean;
  onToggleCompare: (id: string) => void;
}) {
  if (!compareMode) {
    return <SessionCard session={session} />;
  }

  return (
    <div className="relative">
      {/* Compare checkbox overlay */}
      <div
        className="absolute top-2 right-2 z-10"
        onClick={(e) => e.preventDefault()}
      >
        <label
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer"
          style={{
            background: isSelected
              ? 'var(--accent-primary)'
              : 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
            color: isSelected ? '#fff' : 'var(--foreground-secondary)',
            border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--card-border)'}`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleCompare(session.id)}
            className="sr-only"
          />
          {isSelected ? 'Selected' : 'Select'}
        </label>
      </div>
      <div
        className="rounded-xl transition-all"
        style={{
          outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
          outlineOffset: '2px',
        }}
      >
        <SessionCard session={session} />
      </div>
    </div>
  );
}
