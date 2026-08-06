'use client';

import { useState } from 'react';
import { Filter, RotateCcw, Play } from 'lucide-react';
import type { ErrorClassification } from '@/features/question-bank/types';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';

export interface MistakeFilters {
  errorType: ErrorClassification | 'all';
  subject: string;
  topic: string;
  dateFrom: string;
  dateTo: string;
}

const ERROR_TYPE_OPTIONS: Array<{ value: ErrorClassification | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'DidntKnow', label: "Didn't Know" },
  { value: 'ForgotFormula', label: 'Forgot Formula' },
  { value: 'CalculationMistake', label: 'Calculation Error' },
  { value: 'MisreadQuestion', label: 'Misread Question' },
  { value: 'Careless', label: 'Careless' },
  { value: 'TimePressure', label: 'Time Pressure' },
];

interface MistakeFilterBarProps {
  filters: MistakeFilters;
  onFiltersChange: (filters: MistakeFilters) => void;
  availableTopics: string[];
  filteredCount: number;
  onGenerateRetest: () => void;
  retestLoading?: boolean;
}

export function MistakeFilterBar({
  filters,
  onFiltersChange,
  availableTopics,
  filteredCount,
  onGenerateRetest,
  retestLoading = false,
}: MistakeFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const updateFilter = <K extends keyof MistakeFilters>(key: K, value: MistakeFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      errorType: 'all',
      subject: '',
      topic: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters =
    filters.errorType !== 'all' ||
    filters.subject !== '' ||
    filters.topic !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  const selectStyle = {
    borderColor: 'var(--card-border)',
    background: 'var(--background-tertiary, #0f1420)',
    color: 'var(--foreground)',
  };

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--foreground)' }}
        >
          <Filter className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
          Filters
          {hasActiveFilters && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
            >
              Active
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/5"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          <button
            onClick={onGenerateRetest}
            disabled={filteredCount === 0 || retestLoading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: '#ffffff' }}
          >
            <Play className="h-3 w-3" />
            {retestLoading ? 'Generating...' : `Generate Retest (${filteredCount})`}
          </button>
        </div>
      </div>

      {/* Filter Controls (expandable) */}
      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Error Type */}
          <div>
            <label className="mb-1 block text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Error Type
            </label>
            <select
              value={filters.errorType}
              onChange={(e) => updateFilter('errorType', e.target.value as ErrorClassification | 'all')}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              style={selectStyle}
            >
              {ERROR_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) => updateFilter('subject', e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              style={selectStyle}
            >
              <option value="">All Subjects</option>
              {CFA_SUBJECTS_ORDERED.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="mb-1 block text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Topic
            </label>
            <select
              value={filters.topic}
              onChange={(e) => updateFilter('topic', e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              style={selectStyle}
            >
              <option value="">All Topics</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="mb-1 block text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              style={selectStyle}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="mb-1 block text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              style={selectStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}
