import type { ReviewItem } from '../types';
import { getFlashcards } from '@/features/flashcards/utils/storage';
import { getCardsDueToday } from '@/features/flashcards/utils/sm2';
import { getPracticeHistory } from '@/features/practice/utils/practice-storage';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';

const REVISION_SCHEDULE_KEY = 'cfa-buddy-revision-schedule';
const REVISION_INTERVALS = [0, 3, 7, 15, 30];

interface RevisionScheduleEntry {
  stage: number;
  lastRevised: string;
}

function getRevisionSchedule(): Record<string, RevisionScheduleEntry> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(REVISION_SCHEDULE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Build a unified review queue combining due flashcards, practice questions,
 * and revision subjects.
 */
export function buildReviewQueue(): { items: ReviewItem[]; estimatedMinutes: number } {
  if (typeof window === 'undefined') return { items: [], estimatedMinutes: 0 };

  const items: ReviewItem[] = [];

  // 1. Due flashcards
  const allFlashcards = getFlashcards();
  const dueFlashcards = getCardsDueToday(allFlashcards);
  for (const card of dueFlashcards) {
    items.push({
      id: `flashcard-${card.id}`,
      type: 'flashcard',
      title: card.front.length > 60 ? card.front.slice(0, 57) + '...' : card.front,
      subject: card.subject,
      data: card,
    });
  }

  // 2. Due practice questions (nextDue <= now)
  const practiceHistory = getPracticeHistory();
  const now = new Date().toISOString();
  const allQuestions = loadAllQuestions();
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));

  const dueQuestionIds = Object.entries(practiceHistory)
    .filter(([, h]) => h.nextDue <= now)
    .sort(([, a], [, b]) => a.nextDue.localeCompare(b.nextDue))
    .map(([, h]) => h.questionId);

  for (const qId of dueQuestionIds) {
    const question = questionMap.get(qId);
    if (!question) continue;
    items.push({
      id: `question-${question.id}`,
      type: 'question',
      title: question.questionText.length > 60
        ? question.questionText.slice(0, 57) + '...'
        : question.questionText,
      subject: question.subject,
      data: question,
    });
  }

  // 3. Subjects due for revision
  const schedule = getRevisionSchedule();
  const today = new Date();

  for (const subject of CFA_SUBJECTS_ORDERED) {
    const entry = schedule[subject];
    if (!entry) continue;

    const stage = entry.stage;
    const interval = REVISION_INTERVALS[Math.min(stage, REVISION_INTERVALS.length - 1)];
    const lastRevised = new Date(entry.lastRevised);
    const nextDue = new Date(lastRevised.getTime() + interval * 86400000);

    if (nextDue <= today) {
      items.push({
        id: `revision-${subject}`,
        type: 'revision',
        title: `Review: ${subject}`,
        subject,
        data: { stage, lastRevised: entry.lastRevised },
      });
    }
  }

  // Estimate time: 1 min per flashcard, 2 min per question, 5 min per revision
  const estimatedMinutes =
    dueFlashcards.length * 1 +
    dueQuestionIds.length * 2 +
    items.filter(i => i.type === 'revision').length * 5;

  return { items, estimatedMinutes };
}

/**
 * Get just the count and estimated time without building full item data.
 * More efficient for dashboard display.
 */
export function getReviewQueueSummary(): { count: number; estimatedMinutes: number } {
  const { items, estimatedMinutes } = buildReviewQueue();
  return { count: items.length, estimatedMinutes };
}
