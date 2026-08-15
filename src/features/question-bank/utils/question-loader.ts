import type { Question } from '../types';
import { sampleQuestions } from '../data/sample-questions';
import { fixedIncomeQuestions } from '../data/fixed-income';

/**
 * Load all available questions: sample questions + fixed income + any imported questions from localStorage.
 * On the server, only sample questions and fixed income are available.
 * On the client, also loads imported questions stored in localStorage.
 */
export function loadAllQuestions(): Question[] {
  if (typeof window === 'undefined') return [...sampleQuestions, ...fixedIncomeQuestions];

  const imported = loadImportedQuestions();
  if (imported.length > 0) {
    // Deduplicate by ID, imported takes priority
    const idSet = new Set(imported.map(q => q.id));
    const unique = [...imported, ...sampleQuestions.filter(q => !idSet.has(q.id)), ...fixedIncomeQuestions.filter(q => !idSet.has(q.id))];
    return unique;
  }

  return [...sampleQuestions, ...fixedIncomeQuestions];
}

/**
 * Load imported questions from localStorage.
 * These are placed there by the import script results being pasted/loaded.
 */
export function loadImportedQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cfa-buddy-imported-questions');
    if (!raw) return [];
    return JSON.parse(raw) as Question[];
  } catch { return []; }
}

/**
 * Save imported questions to localStorage.
 */
export function saveImportedQuestions(questions: Question[]): void {
  localStorage.setItem('cfa-buddy-imported-questions', JSON.stringify(questions));
}

/**
 * Get count of available questions by subject.
 */
export function getQuestionCountBySubject(): Record<string, number> {
  const all = loadAllQuestions();
  const counts: Record<string, number> = {};
  for (const q of all) {
    counts[q.subject] = (counts[q.subject] ?? 0) + 1;
  }
  return counts;
}
