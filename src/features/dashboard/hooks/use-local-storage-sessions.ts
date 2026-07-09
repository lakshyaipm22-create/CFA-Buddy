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

function getSnapshot(): SessionData[] {
  if (typeof window === 'undefined') return emptyArray;
  const raw = localStorage.getItem('cfa-buddy-sessions');
  if (!raw) return emptyArray;
  try {
    return JSON.parse(raw) as SessionData[];
  } catch {
    return emptyArray;
  }
}

function getServerSnapshot(): SessionData[] {
  return emptyArray;
}

function subscribe(callback: () => void): () => void {
  // Listen for storage events (cross-tab)
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useLocalStorageSessions(): SessionData[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
