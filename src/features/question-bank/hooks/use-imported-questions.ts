'use client';

import { useState, useCallback } from 'react';
import type { Question } from '../types';
import { saveImportedQuestions, loadImportedQuestions } from '../utils/question-loader';

const LAST_FETCH_KEY = 'cfa-buddy-imported-questions-fetched-at';

/**
 * Hook that provides imported question management.
 * Call refresh() to fetch from API and update localStorage.
 */
export function useImportedQuestions() {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return loadImportedQuestions().length;
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/imported-questions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const questions: Question[] = data.questions ?? [];
      if (questions.length > 0) {
        saveImportedQuestions(questions);
        localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
        setCount(questions.length);
      }
      return questions.length;
    } catch {
      return loadImportedQuestions().length;
    } finally {
      setLoading(false);
    }
  }, []);

  return { count, loading, refresh };
}
