import { describe, it, expect } from 'vitest';
import { calculateExamScore, isPassing, formatTime } from '../utils/scoring';
import { PASSING_THRESHOLD } from '../utils/exam-config';
import type { Question } from '@/features/question-bank/types';
import type { MockExamAnswer } from '../types';

function makeQuestion(id: string, subject: string, correctLabel: string = 'A'): Question {
  return {
    id,
    questionText: `Question ${id}`,
    answerChoices: [
      { label: 'A', text: 'Answer A', isCorrect: correctLabel === 'A', explanation: '' },
      { label: 'B', text: 'Answer B', isCorrect: correctLabel === 'B', explanation: '' },
      { label: 'C', text: 'Answer C', isCorrect: correctLabel === 'C', explanation: '' },
    ],
    difficulty: 'Medium',
    subject,
    reading: null,
    topic: null,
    provider: 'test',
    questionSourceFile: null,
  };
}

function makeAnswer(questionId: string, selected: string | null, timeSpent: number = 60): MockExamAnswer {
  return {
    questionId,
    selectedAnswer: selected,
    flagged: false,
    timeSpentSeconds: timeSpent,
  };
}

describe('scoring', () => {
  describe('calculateExamScore', () => {
    it('calculates correct score for all correct answers', () => {
      const questions = [
        makeQuestion('q1', 'Ethics', 'A'),
        makeQuestion('q2', 'Ethics', 'B'),
        makeQuestion('q3', 'Quant', 'C'),
      ];
      const answers = [
        makeAnswer('q1', 'A'),
        makeAnswer('q2', 'B'),
        makeAnswer('q3', 'C'),
      ];

      const result = calculateExamScore(answers, questions, 'exam-1', '2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', 16200);

      expect(result.correctAnswers).toBe(3);
      expect(result.totalQuestions).toBe(3);
      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
    });

    it('calculates correct score for mixed answers', () => {
      const questions = [
        makeQuestion('q1', 'Ethics', 'A'),
        makeQuestion('q2', 'Ethics', 'B'),
        makeQuestion('q3', 'Quant', 'C'),
        makeQuestion('q4', 'Quant', 'A'),
      ];
      const answers = [
        makeAnswer('q1', 'A'), // correct
        makeAnswer('q2', 'A'), // wrong
        makeAnswer('q3', 'C'), // correct
        makeAnswer('q4', 'B'), // wrong
      ];

      const result = calculateExamScore(answers, questions, 'exam-2', '2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', 16200);

      expect(result.correctAnswers).toBe(2);
      expect(result.totalQuestions).toBe(4);
      expect(result.score).toBe(0.5);
      expect(result.passed).toBe(false);
    });

    it('treats unanswered questions as incorrect', () => {
      const questions = [
        makeQuestion('q1', 'Ethics', 'A'),
        makeQuestion('q2', 'Ethics', 'B'),
      ];
      const answers = [
        makeAnswer('q1', 'A'),  // correct
        makeAnswer('q2', null), // unanswered
      ];

      const result = calculateExamScore(answers, questions, 'exam-3', '2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', 16200);

      expect(result.correctAnswers).toBe(1);
      expect(result.totalQuestions).toBe(2);
      expect(result.score).toBe(0.5);
    });

    it('calculates per-subject breakdown', () => {
      const questions = [
        makeQuestion('q1', 'Ethics', 'A'),
        makeQuestion('q2', 'Ethics', 'B'),
        makeQuestion('q3', 'Quantitative Methods', 'C'),
      ];
      const answers = [
        makeAnswer('q1', 'A'), // correct
        makeAnswer('q2', 'A'), // wrong (correct is B)
        makeAnswer('q3', 'C'), // correct
      ];

      const result = calculateExamScore(answers, questions, 'exam-4', '2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', 16200);

      expect(result.subjectScores.length).toBe(2);

      const ethics = result.subjectScores.find((s) => s.subject === 'Ethics');
      expect(ethics).toBeDefined();
      expect(ethics!.correct).toBe(1);
      expect(ethics!.total).toBe(2);
      expect(ethics!.accuracy).toBe(0.5);

      const quant = result.subjectScores.find((s) => s.subject === 'Quantitative Methods');
      expect(quant).toBeDefined();
      expect(quant!.correct).toBe(1);
      expect(quant!.total).toBe(1);
      expect(quant!.accuracy).toBe(1);
    });

    it('calculates time used correctly', () => {
      const questions = [makeQuestion('q1', 'Ethics', 'A')];
      const answers = [makeAnswer('q1', 'A', 90)];

      const result = calculateExamScore(answers, questions, 'exam-5', '2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', 16200);

      expect(result.timeUsedSeconds).toBe(90);
    });

    it('handles empty exam gracefully', () => {
      const result = calculateExamScore([], [], 'exam-6', '2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z', 16200);

      expect(result.correctAnswers).toBe(0);
      expect(result.totalQuestions).toBe(0);
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });
  });

  describe('isPassing', () => {
    it('returns true for scores at or above threshold', () => {
      expect(isPassing(PASSING_THRESHOLD)).toBe(true);
      expect(isPassing(0.8)).toBe(true);
      expect(isPassing(1.0)).toBe(true);
    });

    it('returns false for scores below threshold', () => {
      expect(isPassing(PASSING_THRESHOLD - 0.01)).toBe(false);
      expect(isPassing(0.5)).toBe(false);
      expect(isPassing(0)).toBe(false);
    });
  });

  describe('formatTime', () => {
    it('formats seconds only', () => {
      expect(formatTime(45)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      expect(formatTime(130)).toBe('2m 10s');
    });

    it('formats hours, minutes, and seconds', () => {
      expect(formatTime(3661)).toBe('1h 1m 1s');
    });

    it('formats zero', () => {
      expect(formatTime(0)).toBe('0s');
    });
  });
});
