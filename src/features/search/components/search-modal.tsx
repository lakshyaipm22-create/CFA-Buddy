'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, FileText, HelpCircle, StickyNote } from 'lucide-react';
import type { ContentMetadata } from '@/features/content-scanner/types';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';
import { searchNotes } from '@/features/practice/utils/annotations-storage';

interface SearchResult {
  id: string;
  type: 'resource' | 'question' | 'note';
  title: string;
  subtitle: string;
  href: string;
}

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('cfa-buddy-recent-searches') ?? '[]');
  } catch { return []; }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter(s => s !== query);
  recent.unshift(query);
  localStorage.setItem('cfa-buddy-recent-searches', JSON.stringify(recent.slice(0, 5)));
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => {
          if (!prev) setRecentSearches(getRecentSearches());
          return !prev;
        });
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIdx(0);
  }, []);

  // Search with debounce — resources + questions + notes
  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    const combined: SearchResult[] = [];

    // Search sample questions by text
    const lowerQ = q.toLowerCase();
    const matchedQuestions = sampleQuestions
      .filter(qn => qn.questionText.toLowerCase().includes(lowerQ) || qn.subject.toLowerCase().includes(lowerQ) || (qn.topic ?? '').toLowerCase().includes(lowerQ))
      .slice(0, 5)
      .map(qn => ({
        id: qn.id,
        type: 'question' as const,
        title: qn.questionText.slice(0, 80) + (qn.questionText.length > 80 ? '...' : ''),
        subtitle: `${qn.subject} • ${qn.difficulty}`,
        href: '/questions',
      }));
    combined.push(...matchedQuestions);

    // Search question annotations/notes
    const matchedNotes = searchNotes(q).slice(0, 5).map(n => ({
      id: `note-${n.questionId}`,
      type: 'note' as const,
      title: n.note.slice(0, 80) + (n.note.length > 80 ? '...' : ''),
      subtitle: `Note on question ${n.questionId.slice(0, 8)}...`,
      href: '/practice',
    }));
    combined.push(...matchedNotes);

    // Search resources via API
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const resources = (data.results ?? []).slice(0, 5).map((r: ContentMetadata) => ({
        id: r.id,
        type: 'resource' as const,
        title: r.fileName,
        subtitle: `${r.provider ?? ''} • ${r.subject ?? ''}`.replace(/^ • | • $/g, ''),
        href: `/resources/${r.id}`,
      }));
      combined.push(...resources);
    } catch { /* ignore */ }

    setResults(combined);
    setSelectedIdx(0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void search(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      selectResult(results[selectedIdx]);
    }
  };

  const selectResult = (result: SearchResult) => {
    saveRecentSearch(query);
    handleClose();
    router.push(result.href);
  };

  const selectRecentSearch = (s: string) => {
    setQuery(s);
  };

  if (!open) return null;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'resource': return <FileText className="h-3.5 w-3.5" />;
      case 'question': return <HelpCircle className="h-3.5 w-3.5" />;
      case 'note': return <StickyNote className="h-3.5 w-3.5" />;
      default: return <FileText className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div
        className="relative w-full max-w-lg rounded-xl border shadow-2xl"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
          <Search className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search questions, resources, subjects..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--foreground)' }}
          />
          <button onClick={handleClose} style={{ color: 'var(--foreground-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results or recent searches */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-0.5">
              {results.map((r, idx) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => selectResult(r)}
                  className={`w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    idx === selectedIdx ? 'ring-1 ring-[var(--accent-secondary)]' : ''
                  }`}
                  style={{ background: idx === selectedIdx ? 'var(--nav-hover-bg)' : 'transparent' }}
                >
                  <span className="mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>{typeIcon(r.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>{r.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--foreground-secondary)' }}>{r.subtitle}</p>
                  </div>
                  <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
                    {r.type}
                  </span>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>No results found</p>
          ) : recentSearches.length > 0 ? (
            <div className="space-y-0.5">
              <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>Recent</p>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => selectRecentSearch(s)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:opacity-80"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  <Clock className="h-3 w-3" />
                  <span className="text-sm">{s}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Type to search questions, resources, and notes
            </p>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px]" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
