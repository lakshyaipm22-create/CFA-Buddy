'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, BookOpen, Star, ChevronDown, ChevronRight, Zap, Bookmark, LayoutGrid } from 'lucide-react';
import { formulaSeed, type FormulaEntry } from '../data/formula-seed';
import { sortByCfaOrder } from '@/shared/config/subjects';

type ViewMode = 'all' | 'quick-ref' | 'bookmarked';

const SUBJECTS = sortByCfaOrder([...new Set(formulaSeed.map(f => f.subject))]);

/** Short abbreviation for subject tab labels */
function getSubjectAbbr(subject: string): string {
  const map: Record<string, string> = {
    'Quantitative Methods': 'Quant',
    'Economics': 'Econ',
    'Corporate Issuers': 'Corp',
    'Financial Statement Analysis': 'FSA',
    'Equity Investments': 'Equity',
    'Fixed Income': 'FI',
    'Derivatives': 'Deriv',
    'Alternative Investments': 'Alt Inv',
    'Portfolio Management': 'PM',
    'Ethical and Professional Standards': 'Ethics',
  };
  return map[subject] ?? subject.split(' ').slice(0, 2).join(' ');
}

/** Count formulas per subject from a given set */
function countBySubject(formulas: FormulaEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of formulas) {
    counts[f.subject] = (counts[f.subject] ?? 0) + 1;
  }
  return counts;
}

/** Group formulas by a key (topic or subject) */
function groupBy(formulas: FormulaEntry[], key: 'topic' | 'subject'): Record<string, FormulaEntry[]> {
  const groups: Record<string, FormulaEntry[]> = {};
  for (const f of formulas) {
    const k = f[key];
    if (!groups[k]) groups[k] = [];
    groups[k].push(f);
  }
  return groups;
}

export function FormulaCenter() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('cfa-buddy-formula-bookmarks') ?? '[]'));
    } catch { return new Set(); }
  });

  const toggleBookmark = useCallback((id: string) => {
    setBookmarked(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      localStorage.setItem('cfa-buddy-formula-bookmarks', JSON.stringify([...updated]));
      return updated;
    });
  }, []);

  const toggleTopic = useCallback((topic: string) => {
    setExpandedTopics(prev => {
      const updated = new Set(prev);
      if (updated.has(topic)) updated.delete(topic);
      else updated.add(topic);
      return updated;
    });
  }, []);

  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }, []);

  /** Formulas filtered by view mode only (before subject/search) for subject tab counts */
  const viewModeFilteredFormulas = useMemo(() => {
    if (viewMode === 'quick-ref') {
      return formulaSeed.filter(f => f.examFrequency === 'high');
    } else if (viewMode === 'bookmarked') {
      return formulaSeed.filter(f => bookmarked.has(f.id));
    }
    return formulaSeed;
  }, [viewMode, bookmarked]);

  /** Dynamic subject counts based on current view mode */
  const subjectCounts = useMemo(() => countBySubject(viewModeFilteredFormulas), [viewModeFilteredFormulas]);

  /** Filtered formulas based on view mode, subject, and search */
  const filteredFormulas = useMemo(() => {
    let results = viewModeFilteredFormulas;

    // Subject filter
    if (selectedSubject) {
      results = results.filter(f => f.subject === selectedSubject);
    }

    // Search filter
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      results = results.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.formula.toLowerCase().includes(q) ||
        f.variables.toLowerCase().includes(q) ||
        f.topic.toLowerCase().includes(q)
      );
    }

    return results;
  }, [viewModeFilteredFormulas, selectedSubject, searchQuery]);

  /** Group the filtered formulas */
  const groupedFormulas = useMemo(() => {
    if (viewMode === 'quick-ref' && !selectedSubject) {
      // Group by subject in quick reference mode
      return groupBy(filteredFormulas, 'subject');
    }
    // Group by topic
    return groupBy(filteredFormulas, 'topic');
  }, [filteredFormulas, viewMode, selectedSubject]);

  const groupKeys = useMemo(() => {
    if (viewMode === 'quick-ref' && !selectedSubject) {
      return sortByCfaOrder(Object.keys(groupedFormulas));
    }
    return Object.keys(groupedFormulas);
  }, [groupedFormulas, viewMode, selectedSubject]);

  // Auto-expand all topic groups when there are search results
  const effectiveExpandedTopics = useMemo(() => {
    if (searchQuery.length >= 2) {
      return new Set(groupKeys);
    }
    return expandedTopics;
  }, [searchQuery, groupKeys, expandedTopics]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Bar: Search + View Mode Toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
          <Search
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              height: '1rem',
              width: '1rem',
              color: 'var(--foreground-secondary)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search formulas, variables, topics..."
            style={{
              width: '100%',
              borderRadius: '0.5rem',
              border: '1px solid var(--card-border)',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              fontSize: '0.875rem',
              background: 'var(--card-bg)',
              color: 'var(--foreground)',
              outline: 'none',
            }}
          />
        </div>

        {/* View Mode Toggles */}
        <div style={{ display: 'flex', gap: '0.25rem', borderRadius: '0.5rem', padding: '0.25rem', background: 'var(--nav-hover-bg)' }}>
          <ViewModeButton
            active={viewMode === 'all'}
            onClick={() => setViewMode('all')}
            icon={<LayoutGrid style={{ height: '0.75rem', width: '0.75rem' }} />}
            label="All"
          />
          <ViewModeButton
            active={viewMode === 'quick-ref'}
            onClick={() => setViewMode('quick-ref')}
            icon={<Zap style={{ height: '0.75rem', width: '0.75rem' }} />}
            label="Quick Ref"
          />
          <ViewModeButton
            active={viewMode === 'bookmarked'}
            onClick={() => setViewMode('bookmarked')}
            icon={<Bookmark style={{ height: '0.75rem', width: '0.75rem' }} />}
            label={`Saved (${bookmarked.size})`}
          />
        </div>
      </div>

      {/* Subject Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          scrollbarWidth: 'thin',
        }}
      >
        <SubjectTab
          label={`All (${viewModeFilteredFormulas.length})`}
          active={!selectedSubject}
          onClick={() => setSelectedSubject(null)}
        />
        {SUBJECTS.map(s => (
          <SubjectTab
            key={s}
            label={`${getSubjectAbbr(s)} (${subjectCounts[s] ?? 0})`}
            active={s === selectedSubject}
            onClick={() => setSelectedSubject(s === selectedSubject ? null : s)}
          />
        ))}
      </div>

      {/* Results Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--foreground-secondary)' }}>
          {filteredFormulas.length} formula{filteredFormulas.length !== 1 ? 's' : ''}
          {viewMode === 'quick-ref' && ' (high exam frequency)'}
          {viewMode === 'bookmarked' && ' bookmarked'}
          {selectedSubject && ` in ${getSubjectAbbr(selectedSubject)}`}
        </span>
        {groupKeys.length > 1 && searchQuery.length < 2 && (
          <button
            onClick={() => {
              const allExpanded = groupKeys.every(k => effectiveExpandedTopics.has(k));
              if (allExpanded) {
                setExpandedTopics(new Set());
              } else {
                setExpandedTopics(new Set(groupKeys));
              }
            }}
            style={{
              fontSize: '0.6875rem',
              color: 'var(--accent-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
            }}
          >
            {groupKeys.every(k => effectiveExpandedTopics.has(k)) ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>

      {/* Grouped Formula Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {groupKeys.map(group => {
          const formulas = groupedFormulas[group];
          const isExpanded = effectiveExpandedTopics.has(group);

          return (
            <div
              key={group}
              style={{
                border: '1px solid var(--card-border)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                background: 'var(--card-bg)',
              }}
            >
              {/* Topic/Group Header */}
              <button
                onClick={() => toggleTopic(group)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {isExpanded
                  ? <ChevronDown style={{ height: '1rem', width: '1rem', color: 'var(--accent-secondary)', flexShrink: 0 }} />
                  : <ChevronRight style={{ height: '1rem', width: '1rem', color: 'var(--foreground-secondary)', flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {group}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--foreground-secondary)',
                    background: 'var(--nav-hover-bg)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  {formulas.length}
                </span>
              </button>

              {/* Formula Cards within the group */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', borderTop: '1px solid var(--card-border)' }}>
                  {formulas.map(f => (
                    <FormulaCard
                      key={f.id}
                      formula={f}
                      isBookmarked={bookmarked.has(f.id)}
                      isExpanded={expandedCards.has(f.id)}
                      onToggleBookmark={() => toggleBookmark(f.id)}
                      onToggleExpand={() => toggleCard(f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredFormulas.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-secondary)' }}>
            {viewMode === 'bookmarked'
              ? 'No bookmarked formulas yet. Star formulas to save them here.'
              : 'No formulas match your search.'}
          </p>
        </div>
      )}
    </div>
  );
}

/** View mode toggle button */
function ViewModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.375rem 0.625rem',
        borderRadius: '0.375rem',
        border: 'none',
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms',
        background: active ? 'var(--accent-primary)' : 'transparent',
        color: active ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/** Subject tab button */
function SubjectTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        whiteSpace: 'nowrap',
        padding: '0.375rem 0.75rem',
        borderRadius: '0.375rem',
        border: 'none',
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms',
        background: active ? 'var(--accent-primary)' : 'var(--nav-hover-bg)',
        color: active ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
      }}
    >
      {label}
    </button>
  );
}

/** Frequency badge color */
function getFrequencyColor(freq: FormulaEntry['examFrequency']): string {
  switch (freq) {
    case 'high': return 'var(--accent-success)';
    case 'medium': return 'var(--accent-secondary)';
    case 'low': return '#6b7280';
  }
}

/** Individual formula card */
function FormulaCard({
  formula,
  isBookmarked,
  isExpanded,
  onToggleBookmark,
  onToggleExpand,
}: {
  formula: FormulaEntry;
  isBookmarked: boolean;
  isExpanded: boolean;
  onToggleBookmark: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        background: isExpanded ? 'rgba(197, 162, 88, 0.03)' : 'transparent',
        transition: 'background 150ms',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={onToggleExpand}
        >
          {/* Name + frequency badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
              {formula.name}
            </h4>
            {/* Exam frequency badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.625rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: getFrequencyColor(formula.examFrequency),
              }}
            >
              <span
                style={{
                  width: '0.375rem',
                  height: '0.375rem',
                  borderRadius: '50%',
                  background: getFrequencyColor(formula.examFrequency),
                }}
              />
              {formula.examFrequency}
            </span>
          </div>
          {/* Formula text */}
          <p style={{ margin: '0.25rem 0 0', fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--accent-secondary)' }}>
            {formula.formula}
          </p>
        </div>

        {/* Bookmark button */}
        <button
          onClick={onToggleBookmark}
          style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark formula'}
        >
          <Star
            style={{ height: '1rem', width: '1rem' }}
            fill={isBookmarked ? '#C5A258' : 'none'}
            stroke={isBookmarked ? '#C5A258' : 'var(--foreground-secondary)'}
          />
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <DetailSection label="Variables" content={formula.variables} />
          <DetailSection label="Example" content={formula.example} mono />
          {formula.keyTip && <DetailSection label="Key Tip" content={formula.keyTip} highlight />}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-secondary)' }}>
              <BookOpen style={{ height: '0.625rem', width: '0.625rem', display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
              {formula.reading}
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-secondary)' }}>
              {formula.subject}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '0.25rem',
                background: formula.difficulty === 'core' ? 'rgba(0, 132, 61, 0.1)' : 'rgba(197, 162, 88, 0.1)',
                color: formula.difficulty === 'core' ? 'var(--accent-success)' : 'var(--accent-secondary)',
              }}
            >
              {formula.difficulty}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Detail section within expanded card */
function DetailSection({
  label,
  content,
  mono,
  highlight,
}: {
  label: string;
  content: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <p
        style={{
          margin: '0.125rem 0 0',
          fontSize: '0.75rem',
          fontFamily: mono ? 'monospace' : 'inherit',
          color: highlight ? 'var(--accent-secondary)' : 'var(--foreground)',
          fontStyle: highlight ? 'italic' : 'normal',
        }}
      >
        {content}
      </p>
    </div>
  );
}
