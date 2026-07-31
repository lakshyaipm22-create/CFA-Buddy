'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Question } from '../types';

const STORAGE_KEY = 'cfa-buddy-imported-questions';
const TIMESTAMP_KEY = 'cfa-buddy-questions-loaded-at';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function getStoredQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Question[];
  } catch {
    return [];
  }
}

function isStale(): boolean {
  if (typeof window === 'undefined') return false;
  const timestamp = localStorage.getItem(TIMESTAMP_KEY);
  if (!timestamp) return true;
  const loadedAt = Number(timestamp);
  return Date.now() - loadedAt > TWENTY_FOUR_HOURS;
}

function needsFetch(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return !stored || isStale();
}

async function doFetch(signal: AbortSignal): Promise<Question[] | null> {
  try {
    const res = await fetch('/api/imported-questions', { signal });
    if (!res.ok) return null;
    return (await res.json()) as Question[];
  } catch {
    return null;
  }
}

export function useImportedQuestions() {
  const [questions, setQuestions] = useState<Question[]>(() => getStoredQuestions());
  const [isLoading, setIsLoading] = useState<boolean>(() => needsFetch());
  const hasFetched = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasFetched.current) return;
    if (!needsFetch()) return;

    hasFetched.current = true;
    const controller = new AbortController();

    doFetch(controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
        setQuestions(data);
      }
      setIsLoading(false);
    });

    return () => { controller.abort(); };
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    const controller = new AbortController();
    doFetch(controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
        }
        setQuestions(data);
      }
      setIsLoading(false);
    });
  }, []);

  return { questions, isLoading, refresh };
}
