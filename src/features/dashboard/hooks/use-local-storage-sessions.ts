'use client';

import { useSyncExternalStore } from 'react';

interface SessionData {
  status: string;
  attempts?: Array<{
    correct: boolean;
    timestamp?: string;
    questionId?: string;
    confidence?: string;
    errorClassification?: string;
    timeSpentSeconds?: number;
  }>;
}

const emptyArray: SessionData[] = [];

// Module-level cache for referential stability
let cachedRaw: string | null = null;
let cachedParsed: SessionData[] = emptyArray;

function getSnapshot(): SessionData[] {
  if (typeof window === 'undefined') return emptyArray;
  const raw = localStorage.getItem('cfa-buddy-sessions');
  if (!raw) return emptyArray;
  // Only re-parse if the raw string actually changed
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedParsed = JSON.parse(raw) as SessionData[];
    } catch {
      cachedParsed = emptyArray;
    }
  }
  return cachedParsed;
}

function getServerSnapshot(): SessionData[] {
  return emptyArray;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useLocalStorageSessions(): SessionData[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
