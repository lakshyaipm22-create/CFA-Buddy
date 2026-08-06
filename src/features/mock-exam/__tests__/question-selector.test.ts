import { describe, it, expect } from 'vitest';
import {
  selectMockExamQuestions,
  getAllAvailableQuestions,
  calculateSubjectAllocation,
} from '../utils/question-selector';
import { CFA_LEVEL1_WEIGHTINGS, EXAM_TOTAL_QUESTIONS } from '../utils/exam-config';
import type { Question } from '@/features/question-bank/types';

describe('question-selector', () => {
  describe('getAllAvailableQuestions', () => {
    it('returns all questions from the question bank', () => {
      const questions = getAllAvailableQuestions();
      expect(questions.length).toBeGreaterThan(0);
      // Check that each has the expected structure
      for (const q of questions.slice(0, 5)) {
        expect(q.id).toBeDefined();
        expect(q.questionText).toBeDefined();
        expect(q.answerChoices.length).toBeGreaterThan(0);
        expect(q.subject).toBeDefined();
      }
    });

    it('contains questions from multiple subjects', () => {
      const questions = getAllAvailableQuestions();
      const subjects = new Set(questions.map((q) => q.subject));
      expect(subjects.size).toBeGreaterThan(1);
    });
  });

  describe('calculateSubjectAllocation', () => {
    it('allocates questions proportionally to target percentages', () => {
      const availableBySubject: Record<string, Question[]> = {};
      // Create a large pool for each subject
      for (const w of CFA_LEVEL1_WEIGHTINGS) {
        availableBySubject[w.subject] = Array.from({ length: 50 }, (_, i) => ({
          id: `${w.subject}-${i}`,
          questionText: 'test',
          answerChoices: [],
          difficulty: 'Easy' as const,
          subject: w.subject,
          reading: null,
          topic: null,
          provider: 'test',
          questionSourceFile: null,
        }));
      }

      const allocation = calculateSubjectAllocation(
        CFA_LEVEL1_WEIGHTINGS,
        EXAM_TOTAL_QUESTIONS,
        availableBySubject
      );

      // Total should equal target
      const total = Object.values(allocation).reduce((sum, n) => sum + n, 0);
      expect(total).toBe(EXAM_TOTAL_QUESTIONS);

      // Ethics should be the largest allocation (~17.5%)
      const ethicsCount = allocation['Ethical and Professional Standards'];
      expect(ethicsCount).toBeGreaterThanOrEqual(30); // ~17.5% of 180 = 31.5
      expect(ethicsCount).toBeLessThanOrEqual(36);
    });

    it('caps allocation at available questions when pool is small', () => {
      const availableBySubject: Record<string, Question[]> = {};
      for (const w of CFA_LEVEL1_WEIGHTINGS) {
        // Only 5 questions available per subject
        availableBySubject[w.subject] = Array.from({ length: 5 }, (_, i) => ({
          id: `${w.subject}-${i}`,
          questionText: 'test',
          answerChoices: [],
          difficulty: 'Easy' as const,
          subject: w.subject,
          reading: null,
          topic: null,
          provider: 'test',
          questionSourceFile: null,
        }));
      }

      const allocation = calculateSubjectAllocation(
        CFA_LEVEL1_WEIGHTINGS,
        EXAM_TOTAL_QUESTIONS,
        availableBySubject
      );

      // Each subject should be capped at 5
      for (const w of CFA_LEVEL1_WEIGHTINGS) {
        expect(allocation[w.subject]).toBeLessThanOrEqual(5);
      }

      // Total should be at most 50 (5 * 10 subjects)
      const total = Object.values(allocation).reduce((sum, n) => sum + n, 0);
      expect(total).toBeLessThanOrEqual(50);
    });
  });

  describe('selectMockExamQuestions', () => {
    it('returns up to the target number of questions', () => {
      const questions = selectMockExamQuestions();
      const allAvailable = getAllAvailableQuestions();
      const expected = Math.min(EXAM_TOTAL_QUESTIONS, allAvailable.length);
      expect(questions.length).toBe(expected);
    });

    it('returns questions from multiple subjects', () => {
      const questions = selectMockExamQuestions();
      const subjects = new Set(questions.map((q) => q.subject));
      expect(subjects.size).toBeGreaterThan(1);
    });

    it('does not contain duplicates', () => {
      const questions = selectMockExamQuestions();
      const ids = questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('respects custom question count', () => {
      const questions = selectMockExamQuestions(10);
      expect(questions.length).toBe(10);
    });

    it('returns all questions when fewer than target available', () => {
      // If we have fewer than 180 total, should return all
      const all = getAllAvailableQuestions();
      if (all.length < 180) {
        const questions = selectMockExamQuestions(999);
        expect(questions.length).toBe(all.length);
      }
    });
  });
});
