'use client';

import { Search } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#1a2332] bg-[#0d1117] px-6">
      <div />
      <button
        className="flex items-center gap-2 rounded-lg border border-[#1a2332] bg-[#111827] px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-[#002B5C] hover:text-zinc-300"
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 rounded bg-[#1a2332] px-1.5 py-0.5 text-xs text-zinc-500">⌘K</kbd>
      </button>
      <div />
    </header>
  );
}
