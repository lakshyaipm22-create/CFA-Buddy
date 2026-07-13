const NOTES_KEY = 'cfa-buddy-question-notes';

/**
 * Get all question annotations.
 */
export function getNotes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Get annotation for a specific question.
 */
export function getNote(questionId: string): string {
  const notes = getNotes();
  return notes[questionId] ?? '';
}

/**
 * Save an annotation for a question (max 500 chars).
 */
export function saveNote(questionId: string, note: string): void {
  const trimmed = note.slice(0, 500);
  const notes = getNotes();
  if (trimmed) {
    notes[questionId] = trimmed;
  } else {
    delete notes[questionId];
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/**
 * Delete annotation for a question.
 */
export function deleteNote(questionId: string): void {
  const notes = getNotes();
  delete notes[questionId];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/**
 * Search annotations matching a query string.
 * Returns matching entries with questionId and note text.
 */
export function searchNotes(query: string): { questionId: string; note: string }[] {
  if (!query || query.length < 2) return [];
  const notes = getNotes();
  const lowerQuery = query.toLowerCase();
  const results: { questionId: string; note: string }[] = [];

  for (const [questionId, note] of Object.entries(notes)) {
    if (note.toLowerCase().includes(lowerQuery)) {
      results.push({ questionId, note });
    }
  }

  return results;
}
