import type { QuestionAttempt, ConfidenceMatrix, SessionSummary } from '../types';

/**
 * Classify a single attempt into a confidence matrix category.
 */
export function classifyAttempt(attempt: QuestionAttempt): keyof ConfidenceMatrix {
  if (attempt.correct) {
    switch (attempt.confidence) {
      case 'Certain': return 'mastered';
      case 'ThinkSo': return 'solid';
      case 'Guess': return 'luckyGuess';
    }
  } else {
    switch (attempt.confidence) {
      case 'Certain': return 'misconception';
      case 'ThinkSo': return 'weakArea';
      case 'Guess': return 'knowledgeGap';
    }
  }
}

/**
 * Build a confidence matrix from a list of attempts.
 */
export function buildConfidenceMatrix(attempts: QuestionAttempt[]): ConfidenceMatrix {
  const matrix: ConfidenceMatrix = {
    mastered: 0,
    solid: 0,
    luckyGuess: 0,
    misconception: 0,
    weakArea: 0,
    knowledgeGap: 0,
  };

  for (const attempt of attempts) {
    const category = classifyAttempt(attempt);
    matrix[category]++;
  }

  return matrix;
}

/**
 * Build a complete session summary from attempts and questions.
 */
export function buildSessionSummary(
  attempts: QuestionAttempt[],
  questions: Array<{ id: string; topic: string | null }>
): SessionSummary {
  const correctAnswers = attempts.filter(a => a.correct).length;
  const totalTime = attempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0);

  // By topic breakdown
  const byTopic: Record<string, { correct: number; total: number }> = {};
  for (const attempt of attempts) {
    const question = questions.find(q => q.id === attempt.questionId);
    const topic = question?.topic ?? 'Unknown';
    if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
    byTopic[topic].total++;
    if (attempt.correct) byTopic[topic].correct++;
  }

  return {
    totalQuestions: attempts.length,
    correctAnswers,
    accuracy: attempts.length > 0 ? (correctAnswers / attempts.length) * 100 : 0,
    averageTime: attempts.length > 0 ? totalTime / attempts.length : 0,
    confidenceMatrix: buildConfidenceMatrix(attempts),
    byTopic,
    timeDistribution: attempts.map(a => a.timeSpentSeconds),
  };
}
