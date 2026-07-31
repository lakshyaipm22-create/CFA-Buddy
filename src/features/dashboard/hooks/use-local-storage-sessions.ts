'use client';

import { useState } from 'react';

interface SessionData {
  status: string;
  mode?: string;
  completedAt?: string | null;
  config?: {
    subject?: string;
    [key: string]: unknown;
  };
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

export function useLocalStorageSessions(): SessionData[] {
  const [sessions] = useState<SessionData[]>(() => {
    if (typeof window === 'undefined') return emptyArray;
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return emptyArray;
    try {
      return JSON.parse(raw) as SessionData[];
    } catch {
      return emptyArray;
    }
  });

  return sessions;
}
