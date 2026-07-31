import type { Question } from '@/features/question-bank/types';
import type { PracticeHistory, PracticeRating } from '../types';
import { getPracticeHistory, savePracticeHistory } from './practice-storage';

/**
 * SM-2 quality mapping for practice ratings.
 */
const RATING_QUALITY: Record<PracticeRating, number> = {
  forgot: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

/**
 * Select the next question for practice using spaced repetition logic.
 *
 * Strategy:
 * - 80% of picks come from due questions (nextDue <= now), sorted by overdueness,
 *   weighted by subject weakness (lower accuracy subjects appear more often)
 * - 20% of picks come from new (never-seen) questions
 *
 * @param allQuestions - All available questions
 * @param excludeId - Optionally exclude a specific question (e.g., the current one)
 */
export function selectNextQuestion(
  allQuestions: Question[],
  excludeId?: string
): Question | null {
  if (allQuestions.length === 0) return null;

  const history = getPracticeHistory();
  const now = new Date().toISOString();

  // Partition into due, new, and not-yet-due
  const dueQuestions: Question[] = [];
  const newQuestions: Question[] = [];

  for (const q of allQuestions) {
    if (q.id === excludeId) continue;
    const h = history[q.id];
    if (!h) {
      newQuestions.push(q);
    } else if (h.nextDue <= now) {
      dueQuestions.push(q);
    }
  }

  // Compute subject weakness weights
  const subjectAccuracy = computeSubjectAccuracy();

  // Decide: 80% due, 20% new (if available)
  const random = Math.random();
  const pickFromDue = dueQuestions.length > 0 && (random < 0.8 || newQuestions.length === 0);

  if (pickFromDue && dueQuestions.length > 0) {
    // Sort by overdueness (most overdue first), then weight by subject weakness
    const scored = dueQuestions.map(q => {
      const h = history[q.id];
      const overdueMs = Date.now() - new Date(h.nextDue).getTime();
      const subjectWeight = getSubjectWeight(q.subject, subjectAccuracy);
      return { question: q, score: overdueMs * subjectWeight };
    });

    scored.sort((a, b) => b.score - a.score);

    // Pick from top 5 with some randomness to avoid always showing the same one
    const topN = Math.min(5, scored.length);
    const idx = Math.floor(Math.random() * topN);
    return scored[idx].question;
  }

  if (newQuestions.length > 0) {
    // Weight new questions by subject weakness too
    const scored = newQuestions.map(q => {
      const subjectWeight = getSubjectWeight(q.subject, subjectAccuracy);
      return { question: q, score: subjectWeight + Math.random() * 0.5 };
    });
    scored.sort((a, b) => b.score - a.score);

    const topN = Math.min(5, scored.length);
    const idx = Math.floor(Math.random() * topN);
    return scored[idx].question;
  }

  // All questions have been seen and none are due - pick the one due soonest
  const allSeen = allQuestions
    .filter(q => q.id !== excludeId && history[q.id])
    .sort((a, b) => {
      const ha = history[a.id];
      const hb = history[b.id];
      return ha.nextDue.localeCompare(hb.nextDue);
    });

  return allSeen[0] ?? allQuestions[0];
}

/**
 * Update practice history after rating a question.
 * Uses SM-2 algorithm adapted for questions.
 */
export function updatePracticeHistory(
  questionId: string,
  rating: PracticeRating
): PracticeHistory {
  const history = getPracticeHistory();
  const quality = RATING_QUALITY[rating];
  const now = new Date().toISOString();

  const existing = history[questionId];
  let easeFactor = existing?.easeFactor ?? 2.5;
  let interval = existing?.interval ?? 0;
  let timesCorrect = existing?.timesCorrect ?? 0;
  let timesWrong = existing?.timesWrong ?? 0;

  // Track correct/wrong
  if (quality >= 3) {
    timesCorrect += 1;
  } else {
    timesWrong += 1;
  }

  // SM-2 interval calculation
  if (quality < 3) {
    // Failed - reset interval
    interval = 1;
  } else {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor (never below 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate next due date
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + interval);

  const updated: PracticeHistory = {
    questionId,
    lastSeen: now,
    timesCorrect,
    timesWrong,
    easeFactor,
    interval,
    nextDue: nextDue.toISOString(),
  };

  history[questionId] = updated;
  savePracticeHistory(history);

  return updated;
}

/**
 * Compute per-subject accuracy from session history.
 * Returns a map of subject -> accuracy (0-1).
 */
function computeSubjectAccuracy(): Record<string, number> {
  // We need to know the subject for each question. Since history doesn't store subject,
  // we compute a proxy: questions with low ease factor belong to weak areas.
  // Instead, we'll use a simpler approach: group by asking the caller.
  // For now, return an empty map and use ease factor directly for weighting.
  const accuracies: Record<string, { correct: number; total: number }> = {};

  // Subject accuracy is computed from session history and practice history.
  // Individual history entries are factored in via sessions below.

  // Load from session history if available
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return {};
    const sessions = JSON.parse(raw) as Array<{
      status: string;
      attempts: Array<{ questionId: string; correct: boolean }>;
      questionIds: string[];
    }>;

    // We need question subjects - load from the question bank
    const questionSubjects = getQuestionSubjectMap();

    for (const session of sessions) {
      if (session.status !== 'completed') continue;
      for (const attempt of session.attempts) {
        const subject = questionSubjects[attempt.questionId];
        if (!subject) continue;
        if (!accuracies[subject]) {
          accuracies[subject] = { correct: 0, total: 0 };
        }
        accuracies[subject].total += 1;
        if (attempt.correct) {
          accuracies[subject].correct += 1;
        }
      }
    }
  } catch {
    // ignore
  }

  // Also factor in practice history
  // Use ease factor as a proxy for per-question performance
  const result: Record<string, number> = {};
  for (const [subject, data] of Object.entries(accuracies)) {
    result[subject] = data.total > 0 ? data.correct / data.total : 0.5;
  }

  return result;
}

/**
 * Get a weight for a subject based on accuracy. Lower accuracy = higher weight.
 */
function getSubjectWeight(
  subject: string,
  accuracies: Record<string, number>
): number {
  const accuracy = accuracies[subject];
  if (accuracy === undefined) return 1.5; // Unknown subject gets moderate boost
  // Invert: 0% accuracy -> weight 2.0, 100% accuracy -> weight 0.5
  return 2.0 - accuracy * 1.5;
}

/**
 * Build a map of questionId -> subject from loaded questions.
 * Cached at module level to avoid repeated localStorage reads.
 */
let cachedQuestionSubjectMap: Record<string, string> | null = null;

export function setQuestionSubjectMap(questions: Array<{ id: string; subject: string }>): void {
  const map: Record<string, string> = {};
  for (const q of questions) {
    map[q.id] = q.subject;
  }
  cachedQuestionSubjectMap = map;
}

function getQuestionSubjectMap(): Record<string, string> {
  if (cachedQuestionSubjectMap) return cachedQuestionSubjectMap;
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem('cfa-buddy-imported-questions');
    const sampleRaw = localStorage.getItem('cfa-buddy-question-subject-map');
    if (sampleRaw) {
      cachedQuestionSubjectMap = JSON.parse(sampleRaw);
      return cachedQuestionSubjectMap!;
    }
    if (raw) {
      const questions = JSON.parse(raw) as Array<{ id: string; subject: string }>;
      const map: Record<string, string> = {};
      for (const q of questions) {
        map[q.id] = q.subject;
      }
      cachedQuestionSubjectMap = map;
      return map;
    }
    return {};
  } catch {
    return {};
  }
}
