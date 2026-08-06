import type { Question } from '../types';
import { getAllAttempts } from './attempt-storage';
import { loadAllQuestions } from './question-loader';

export interface WeakTopic {
  topic: string;
  subject: string;
  accuracy: number;
  incorrectCount: number;
  totalCount: number;
  questionIds: string[];
}

/**
 * Analyze all practice attempts and identify topics where the user
 * scored below 70% accuracy. Returns topics sorted by accuracy ascending
 * (weakest first).
 */
export function getWeakTopics(): WeakTopic[] {
  const attempts = getAllAttempts();
  const allQuestions = loadAllQuestions();

  // Build a lookup: questionId -> Question
  const questionMap = new Map<string, Question>();
  for (const q of allQuestions) {
    questionMap.set(q.id, q);
  }

  // Aggregate per-topic stats from all attempts
  const topicStats = new Map<
    string,
    { subject: string; correct: number; total: number; incorrectIds: Set<string>; allIds: Set<string> }
  >();

  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        const question = questionMap.get(qa.questionId);
        if (!question) continue;

        const topic = question.topic || question.subject;
        const key = `${question.subject}::${topic}`;

        let stats = topicStats.get(key);
        if (!stats) {
          stats = { subject: question.subject, correct: 0, total: 0, incorrectIds: new Set(), allIds: new Set() };
          topicStats.set(key, stats);
        }

        stats.total++;
        stats.allIds.add(qa.questionId);
        if (qa.correct) {
          stats.correct++;
        } else {
          stats.incorrectIds.add(qa.questionId);
        }
      }
    }
  }

  // Filter to topics with accuracy < 70% and at least 2 attempts
  const weakTopics: WeakTopic[] = [];
  for (const [key, stats] of topicStats) {
    if (stats.total < 2) continue;
    const accuracy = stats.correct / stats.total;
    if (accuracy >= 0.7) continue;

    const topic = key.split('::')[1];
    // Gather question IDs available in the bank for this topic
    const topicQuestionIds = allQuestions
      .filter(q => (q.topic || q.subject) === topic && q.subject === stats.subject)
      .map(q => q.id);

    weakTopics.push({
      topic,
      subject: stats.subject,
      accuracy,
      incorrectCount: stats.incorrectIds.size,
      totalCount: stats.total,
      questionIds: topicQuestionIds,
    });
  }

  // Sort by accuracy ascending (weakest first)
  weakTopics.sort((a, b) => a.accuracy - b.accuracy);

  return weakTopics;
}

/**
 * Generate a quiz targeting weak topics.
 * Prioritizes:
 *   1. Questions previously answered incorrectly
 *   2. Questions from topics with lowest accuracy
 *   3. Mix of difficulties
 *
 * Returns an array of question IDs.
 */
export function generateWeakTopicQuiz(count: number = 15): string[] {
  const weakTopics = getWeakTopics();
  if (weakTopics.length === 0) return [];

  const allQuestions = loadAllQuestions();
  const questionMap = new Map<string, Question>();
  for (const q of allQuestions) {
    questionMap.set(q.id, q);
  }

  // Collect all incorrect question IDs from attempts
  const attempts = getAllAttempts();
  const incorrectIds = new Set<string>();
  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        if (!qa.correct) {
          incorrectIds.add(qa.questionId);
        }
      }
    }
  }

  const selected: string[] = [];
  const usedIds = new Set<string>();

  // Phase 1: Previously incorrect questions from weak topics (prioritized by topic weakness)
  for (const weakTopic of weakTopics) {
    if (selected.length >= count) break;
    const incorrectFromTopic = weakTopic.questionIds.filter(
      id => incorrectIds.has(id) && !usedIds.has(id)
    );
    // Take up to a proportional share based on topic weakness
    const share = Math.max(2, Math.ceil(count / weakTopics.length));
    for (const id of shuffleArray(incorrectFromTopic).slice(0, share)) {
      if (selected.length >= count) break;
      selected.push(id);
      usedIds.add(id);
    }
  }

  // Phase 2: Fill remaining with unseen questions from weak topics, mixing difficulties
  if (selected.length < count) {
    const remaining: Array<{ id: string; accuracy: number; difficulty: string }> = [];
    for (const weakTopic of weakTopics) {
      for (const id of weakTopic.questionIds) {
        if (usedIds.has(id)) continue;
        const q = questionMap.get(id);
        if (!q) continue;
        remaining.push({ id, accuracy: weakTopic.accuracy, difficulty: q.difficulty });
      }
    }

    // Sort by topic accuracy ascending (weakest topics first), then shuffle within same accuracy
    remaining.sort((a, b) => a.accuracy - b.accuracy);

    // Try to get a mix of difficulties from the remaining pool
    const byDifficulty: Record<string, string[]> = { Easy: [], Medium: [], Hard: [] };
    for (const item of remaining) {
      byDifficulty[item.difficulty]?.push(item.id);
    }

    const needed = count - selected.length;
    // Aim for 30% Easy, 40% Medium, 30% Hard from weak topics
    const easyTarget = Math.ceil(needed * 0.3);
    const hardTarget = Math.ceil(needed * 0.3);
    const mediumTarget = needed - easyTarget - hardTarget;

    const picks = [
      ...byDifficulty.Easy.slice(0, easyTarget),
      ...byDifficulty.Medium.slice(0, mediumTarget),
      ...byDifficulty.Hard.slice(0, hardTarget),
    ];

    for (const id of picks) {
      if (selected.length >= count) break;
      if (!usedIds.has(id)) {
        selected.push(id);
        usedIds.add(id);
      }
    }

    // If still not enough, take whatever is left
    if (selected.length < count) {
      for (const item of remaining) {
        if (selected.length >= count) break;
        if (!usedIds.has(item.id)) {
          selected.push(item.id);
          usedIds.add(item.id);
        }
      }
    }
  }

  return shuffleArray(selected);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
