'use client';

import { Search } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div />
      <button
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        onClick={() => {
          // Will be wired to global search modal
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">⌘K</kbd>
      </button>
      <div />
    </header>
  );
}
