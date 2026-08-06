import type { Question } from '@/features/question-bank/types';
import type { MockExamAnswer, MockExamResult, SubjectScore } from '../types';
import { PASSING_THRESHOLD } from './exam-config';

/**
 * Calculates the overall score and per-subject breakdown for a mock exam.
 */
export function calculateExamScore(
  answers: MockExamAnswer[],
  questions: Question[],
  examId: string,
  startedAt: string,
  completedAt: string,
  timeLimitSeconds: number
): MockExamResult {
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let correctAnswers = 0;
  const subjectData: Record<string, { correct: number; total: number }> = {};

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    const subject = question.subject;
    if (!subjectData[subject]) {
      subjectData[subject] = { correct: 0, total: 0 };
    }
    subjectData[subject].total++;

    if (answer.selectedAnswer) {
      const correctChoice = question.answerChoices.find((c) => c.isCorrect);
      if (correctChoice && correctChoice.label === answer.selectedAnswer) {
        correctAnswers++;
        subjectData[subject].correct++;
      }
    }
  }

  const totalQuestions = answers.length;
  const score = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  const passed = score >= PASSING_THRESHOLD;

  const subjectScores: SubjectScore[] = Object.entries(subjectData).map(
    ([subject, data]) => ({
      subject,
      correct: data.correct,
      total: data.total,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
    })
  );

  // Sort by subject name for consistent display
  subjectScores.sort((a, b) => a.subject.localeCompare(b.subject));

  const totalTimeUsed = answers.reduce(
    (sum, a) => sum + a.timeSpentSeconds,
    0
  );

  return {
    id: examId,
    startedAt,
    completedAt,
    totalQuestions,
    correctAnswers,
    score,
    passed,
    timeUsedSeconds: totalTimeUsed,
    timeLimitSeconds,
    subjectScores,
    answers,
    questionIds: answers.map((a) => a.questionId),
  };
}

/**
 * Determines if a score meets the passing threshold.
 */
export function isPassing(score: number): boolean {
  return score >= PASSING_THRESHOLD;
}

/**
 * Formats time in seconds to a human-readable string.
 */
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
