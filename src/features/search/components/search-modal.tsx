'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { ContentMetadata } from '@/features/content-scanner/types';

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentMetadata[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
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

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  // Search with debounce
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void search(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const selectResult = (resource: ContentMetadata) => {
    setOpen(false);
    router.push(`/resources/${resource.id}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-[#1a2332] bg-[#0d1117] shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#1a2332] px-4 py-3">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources, subjects, readings..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          <button onClick={handleClose} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.slice(0, 10).map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectResult(r)}
                  className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#1a2332]"
                >
                  <p className="text-sm text-zinc-200">{r.fileName}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {r.provider} • {r.subject} {r.reading && `• ${r.reading}`}
                  </p>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <p className="px-3 py-4 text-center text-sm text-zinc-500">No results found</p>
          ) : (
            <p className="px-3 py-4 text-center text-sm text-zinc-600">Type at least 2 characters to search</p>
          )}
        </div>
      </div>
    </div>
  );
}
