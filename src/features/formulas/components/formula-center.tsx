'use client';

import { useState, useMemo } from 'react';
import { Search, BookOpen, Star } from 'lucide-react';
import { formulaSeed, type FormulaEntry } from '../data/formula-seed';
import { sortByCfaOrder } from '@/shared/config/subjects';

const SUBJECTS = sortByCfaOrder([...new Set(formulaSeed.map(f => f.subject))]);

export function FormulaCenter() {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('cfa-buddy-formula-bookmarks') ?? '[]'));
    } catch { return new Set(); }
  });

  const filteredFormulas = useMemo(() => {
    let results = formulaSeed;
    if (selectedSubject) results = results.filter(f => f.subject === selectedSubject);
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      results = results.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.formula.toLowerCase().includes(q) ||
        f.subject.toLowerCase().includes(q)
      );
    }
    // Show bookmarked first
    return results.sort((a, b) => {
      const aBookmarked = bookmarked.has(a.id) ? 0 : 1;
      const bBookmarked = bookmarked.has(b.id) ? 0 : 1;
      return aBookmarked - bBookmarked;
    });
  }, [selectedSubject, searchQuery, bookmarked]);

  const toggleBookmark = (id: string) => {
    const updated = new Set(bookmarked);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setBookmarked(updated);
    localStorage.setItem('cfa-buddy-formula-bookmarks', JSON.stringify([...updated]));
  };

  return (
    <div className="space-y-6">
      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search formulas..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedSubject(null)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={!selectedSubject ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' } : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
          >
            All ({formulaSeed.length})
          </button>
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s === selectedSubject ? null : s)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={s === selectedSubject ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' } : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
            >
              {s.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Formula Cards */}
      <div className="space-y-3">
        {filteredFormulas.map(f => (
          <FormulaCard key={f.id} formula={f} isBookmarked={bookmarked.has(f.id)} onToggleBookmark={() => toggleBookmark(f.id)} />
        ))}
      </div>

      {filteredFormulas.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          No formulas match your search.
        </p>
      )}
    </div>
  );
}

function FormulaCard({ formula, isBookmarked, onToggleBookmark }: { formula: FormulaEntry; isBookmarked: boolean; onToggleBookmark: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--accent-secondary)' }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
              {formula.subject}
            </span>
          </div>
          <h4 className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{formula.name}</h4>
          <p className="mt-1 font-mono text-sm font-medium" style={{ color: 'var(--accent-secondary)' }}>{formula.formula}</p>
        </div>
        <button onClick={onToggleBookmark} className="p-1" title="Bookmark formula">
          <Star className="h-4 w-4" fill={isBookmarked ? '#C5A258' : 'none'} stroke={isBookmarked ? '#C5A258' : 'var(--foreground-secondary)'} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--foreground-secondary)' }}>Variables</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground)' }}>{formula.variables}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--foreground-secondary)' }}>Example</p>
            <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--foreground)' }}>{formula.example}</p>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>Reading: {formula.reading}</p>
        </div>
      )}
    </div>
  );
}
