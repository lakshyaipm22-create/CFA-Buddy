'use client';

import { Filter } from 'lucide-react';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';
import type { SessionFilter, SortOption, TestMode } from '../types';

const TEST_MODES: { value: TestMode; label: string }[] = [
  { value: 'Topic', label: 'Topic Test' },
  { value: 'Subject', label: 'Subject Test' },
  { value: 'Mixed', label: 'Mixed Test' },
  { value: 'QuickTopic', label: 'Quick Test' },
  { value: 'AdaptiveRetest', label: 'Adaptive Retest' },
  { value: 'Random', label: 'Random Test' },
  { value: 'WeakTopic', label: 'Weak Topic' },
  { value: 'Mock', label: 'Mock Exam' },
];

interface SessionFiltersProps {
  filter: SessionFilter;
  sortBy: SortOption;
  onFilterChange: (filter: SessionFilter) => void;
  onSortChange: (sort: SortOption) => void;
  totalResults: number;
}

export function SessionFilters({
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
  totalResults,
}: SessionFiltersProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5" style={{ color: 'var(--foreground-secondary)' }}>
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium">Filters</span>
        </div>

        {/* Date Range */}
        <SelectControl
          value={filter.dateRange}
          onChange={(v) => onFilterChange({ ...filter, dateRange: v as SessionFilter['dateRange'] })}
          options={[
            { value: 'all', label: 'All Time' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
          ]}
        />

        {/* Subject */}
        <SelectControl
          value={filter.subject ?? ''}
          onChange={(v) => onFilterChange({ ...filter, subject: v || null })}
          options={[
            { value: '', label: 'All Subjects' },
            ...CFA_SUBJECTS_ORDERED.map((s) => ({ value: s, label: s })),
          ]}
        />

        {/* Mode */}
        <SelectControl
          value={filter.mode ?? ''}
          onChange={(v) => onFilterChange({ ...filter, mode: (v || null) as TestMode | null })}
          options={[
            { value: '', label: 'All Modes' },
            ...TEST_MODES.map((m) => ({ value: m.value, label: m.label })),
          ]}
        />

        {/* Score Range */}
        <SelectControl
          value={filter.scoreRange}
          onChange={(v) =>
            onFilterChange({ ...filter, scoreRange: v as SessionFilter['scoreRange'] })
          }
          options={[
            { value: 'all', label: 'All Scores' },
            { value: 'below60', label: '< 60%' },
            { value: '60to80', label: '60-80%' },
            { value: 'above80', label: '> 80%' },
          ]}
        />

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px" style={{ background: 'var(--card-border)' }} />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Sort:
          </span>
          <SelectControl
            value={sortBy}
            onChange={(v) => onSortChange(v as SortOption)}
            options={[
              { value: 'date', label: 'Most Recent' },
              { value: 'score', label: 'Highest Score' },
              { value: 'duration', label: 'Longest' },
            ]}
          />
        </div>

        {/* Result count */}
        <span className="ml-auto text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {totalResults} session{totalResults !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border px-2 py-1 text-xs outline-none cursor-pointer"
      style={{
        borderColor: 'var(--card-border)',
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
