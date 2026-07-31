/**
 * Weak Topic Deep Dive utilities.
 * Identifies weakest topics from attempt data and generates mini-quizzes.
 */

import type { PracticeAttempt } from '../types/attempt';
import type { Question } from '../types/index';

export interface WeakTopic {
  topic: string;
  accuracy: number;
  totalQuestions: number;
  incorrectQuestionIds: string[];
}

/**
 * Identify the N weakest topics based on accuracy across all attempts.
 * Groups questions by their topic field, cross-referenced with attempt question results.
 */
export function identifyWeakestTopics(
  attempts: PracticeAttempt[],
  questions: Question[],
  topN = 3
): WeakTopic[] {
  // Build a map from questionId -> Question for quick lookup
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  // Track per-topic: correct count, total count, and incorrect question IDs
  const topicStats: Record<string, { correct: number; total: number; incorrectIds: Set<string> }> = {};

  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        const question = questionMap.get(qa.questionId);
        const topic = question?.topic ?? 'Unknown';

        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0, incorrectIds: new Set() };
        }

        topicStats[topic].total += 1;
        if (qa.correct) {
          topicStats[topic].correct += 1;
        } else {
          topicStats[topic].incorrectIds.add(qa.questionId);
        }
      }
    }
  }

  // Convert to array and compute accuracy
  const topicArray: WeakTopic[] = Object.entries(topicStats)
    .filter(([topic]) => topic !== 'Unknown')
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      totalQuestions: stats.total,
      incorrectQuestionIds: Array.from(stats.incorrectIds),
    }));

  // Sort by accuracy ascending (weakest first), then by total questions descending for ties
  topicArray.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.totalQuestions - a.totalQuestions;
  });

  return topicArray.slice(0, topN);
}

/**
 * Get full Question objects for missed questions in a specific topic.
 */
export function getWeakTopicQuestionDetails(
  topic: string,
  attempts: PracticeAttempt[],
  questions: Question[]
): Question[] {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  const incorrectIds = new Set<string>();

  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        if (!qa.correct) {
          const question = questionMap.get(qa.questionId);
          if (question?.topic === topic) {
            incorrectIds.add(qa.questionId);
          }
        }
      }
    }
  }

  return Array.from(incorrectIds)
    .map(id => questionMap.get(id))
    .filter((q): q is Question => q !== undefined);
}

/**
 * Generate a mini-quiz for a specific weak topic.
 * Prioritizes questions the user got wrong, then fills with other questions from the topic.
 */
export function generateMiniQuiz(
  topic: string,
  questions: Question[],
  count = 5,
  attempts?: PracticeAttempt[]
): Question[] {
  // Get all questions for this topic
  const topicQuestions = questions.filter(q => q.topic === topic);

  if (topicQuestions.length === 0) return [];

  // If we have attempt data, prioritize wrong answers
  if (attempts && attempts.length > 0) {
    const incorrectIds = new Set<string>();
    for (const attempt of attempts) {
      for (const moduleResult of attempt.moduleResults) {
        for (const qa of moduleResult.questionAttempts) {
          if (!qa.correct) {
            const question = questions.find(q => q.id === qa.questionId);
            if (question?.topic === topic) {
              incorrectIds.add(qa.questionId);
            }
          }
        }
      }
    }

    // Prioritize incorrect questions
    const incorrectQuestions = topicQuestions.filter(q => incorrectIds.has(q.id));
    const otherQuestions = topicQuestions.filter(q => !incorrectIds.has(q.id));

    // Shuffle each group for variety
    const shuffledIncorrect = shuffleArray(incorrectQuestions);
    const shuffledOther = shuffleArray(otherQuestions);

    const result = [...shuffledIncorrect, ...shuffledOther];
    return result.slice(0, count);
  }

  // No attempt data: just shuffle and pick
  return shuffleArray(topicQuestions).slice(0, count);
}

/**
 * Fisher-Yates shuffle (returns a new array).
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
