import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeStudyRecommendation, getQuickRecommendations } from '../utils/session-recommender';
import type { Question } from '../types';
import type { PracticeAttempt } from '../types/attempt';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: `q-${Math.random().toString(36).slice(2)}`,
    questionText: 'Sample question',
    answerChoices: [
      { label: 'A', text: 'Option A', isCorrect: true, explanation: 'Correct' },
      { label: 'B', text: 'Option B', isCorrect: false, explanation: 'Wrong' },
      { label: 'C', text: 'Option C', isCorrect: false, explanation: 'Wrong' },
    ],
    difficulty: 'Easy',
    subject: 'Ethical and Professional Standards',
    reading: null,
    topic: null,
    provider: 'test',
    questionSourceFile: null,
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: `attempt-${Math.random().toString(36).slice(2)}`,
    subjectName: 'Ethical and Professional Standards',
    attemptNumber: 1,
    completedAt: new Date().toISOString(),
    overallScore: 7,
    overallTotal: 10,
    overallPercentage: 70,
    avgTimePerQuestion: 90,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
    moduleResults: [
      {
        moduleId: 'mod-1',
        moduleName: 'Ethical and Professional Standards',
        score: 7,
        total: 10,
        percentage: 70,
        avgTimePerQuestion: 90,
        questionAttempts: [],
      },
    ],
    ...overrides,
  };
}

const SUBJECTS = [
  'Ethical and Professional Standards',
  'Quantitative Methods',
  'Economics',
  'Financial Statement Analysis',
  'Corporate Issuers',
  'Equity Investments',
  'Fixed Income',
  'Derivatives',
  'Alternative Investments',
  'Portfolio Management',
];

describe('Session Recommender Property Tests', () => {
  it('recommended question count is always between 10 and 30', () => {
    const attemptsArb = fc.array(
      fc.record({
        score: fc.integer({ min: 0, max: 10 }),
        total: fc.constant(10),
        subject: fc.constantFrom(...SUBJECTS),
        daysAgo: fc.integer({ min: 0, max: 60 }),
      }),
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(attemptsArb, (attemptConfigs) => {
        const attempts: PracticeAttempt[] = attemptConfigs.map((cfg, idx) => {
          const completedDate = new Date();
          completedDate.setDate(completedDate.getDate() - cfg.daysAgo);
          return makeAttempt({
            id: `attempt-${idx}`,
            subjectName: cfg.subject,
            overallScore: cfg.score,
            overallTotal: cfg.total,
            overallPercentage: Math.round((cfg.score / cfg.total) * 100),
            completedAt: completedDate.toISOString(),
            moduleResults: [
              {
                moduleId: `mod-${idx}`,
                moduleName: cfg.subject,
                score: cfg.score,
                total: cfg.total,
                percentage: Math.round((cfg.score / cfg.total) * 100),
                avgTimePerQuestion: 90,
                questionAttempts: [],
              },
            ],
          });
        });

        const questions = SUBJECTS.flatMap((subject) =>
          Array.from({ length: 20 }, (_, i) =>
            makeQuestion({ id: `q-${subject}-${i}`, subject, difficulty: 'Easy' })
          )
        );

        const recommendation = computeStudyRecommendation(attempts, questions);
        expect(recommendation.recommendedQuestionCount).toBeGreaterThanOrEqual(10);
        expect(recommendation.recommendedQuestionCount).toBeLessThanOrEqual(30);
      }),
      { numRuns: 50 }
    );
  });

  it('recommended module is always a valid CFA subject', () => {
    const attemptCountArb = fc.integer({ min: 0, max: 5 });

    fc.assert(
      fc.property(attemptCountArb, (count) => {
        const attempts: PracticeAttempt[] = Array.from({ length: count }, (_, idx) =>
          makeAttempt({
            id: `attempt-${idx}`,
            subjectName: SUBJECTS[idx % SUBJECTS.length],
            moduleResults: [
              {
                moduleId: `mod-${idx}`,
                moduleName: SUBJECTS[idx % SUBJECTS.length],
                score: 5,
                total: 10,
                percentage: 50,
                avgTimePerQuestion: 90,
                questionAttempts: [],
              },
            ],
          })
        );

        const questions = SUBJECTS.flatMap((subject) =>
          Array.from({ length: 10 }, (_, i) =>
            makeQuestion({ id: `q-${subject}-${i}`, subject })
          )
        );

        const recommendation = computeStudyRecommendation(attempts, questions);
        expect(SUBJECTS).toContain(recommendation.recommendedModule);
      }),
      { numRuns: 50 }
    );
  });

  it('quick recommendations always returns exactly 3 options with positive question counts', () => {
    const attemptCountArb = fc.integer({ min: 1, max: 8 });

    fc.assert(
      fc.property(attemptCountArb, (count) => {
        const attempts: PracticeAttempt[] = Array.from({ length: count }, (_, idx) =>
          makeAttempt({
            id: `attempt-${idx}`,
            subjectName: SUBJECTS[idx % SUBJECTS.length],
            overallScore: (idx + 3) % 10,
            overallTotal: 10,
            overallPercentage: ((idx + 3) % 10) * 10,
            moduleResults: [
              {
                moduleId: `mod-${idx}`,
                moduleName: SUBJECTS[idx % SUBJECTS.length],
                score: (idx + 3) % 10,
                total: 10,
                percentage: ((idx + 3) % 10) * 10,
                avgTimePerQuestion: 90,
                questionAttempts: [],
              },
            ],
          })
        );

        const questions = SUBJECTS.flatMap((subject) =>
          Array.from({ length: 15 }, (_, i) =>
            makeQuestion({ id: `q-${subject}-${i}`, subject })
          )
        );

        const options = getQuickRecommendations(attempts, questions);
        expect(options).toHaveLength(3);
        for (const option of options) {
          expect(option.questionCount).toBeGreaterThan(0);
          expect(option.estimatedMinutes).toBeGreaterThan(0);
          expect(option.module).toBeTruthy();
        }
      }),
      { numRuns: 50 }
    );
  });
});
