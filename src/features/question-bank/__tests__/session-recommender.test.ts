import { describe, it, expect } from 'vitest';
import {
  computeStudyRecommendation,
  getQuickRecommendations,
} from '../utils/session-recommender';
import type { PracticeAttempt, AttemptQuestion } from '../types/attempt';
import type { Question } from '../types';

function createQuestion(
  id: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  subject: string
): Question {
  return {
    id,
    questionText: `Question ${id}`,
    answerChoices: [
      { label: 'A', text: 'Answer A', isCorrect: true, explanation: 'Correct' },
      { label: 'B', text: 'Answer B', isCorrect: false, explanation: 'Wrong' },
      { label: 'C', text: 'Answer C', isCorrect: false, explanation: 'Wrong' },
    ],
    difficulty,
    subject,
    reading: null,
    topic: null,
    provider: 'test',
    questionSourceFile: null,
  };
}

function createAttemptQuestion(questionId: string, correct: boolean): AttemptQuestion {
  return {
    questionId,
    selectedAnswer: 'A',
    correct,
    timeSpentSeconds: 60,
    confidence: 'High',
  };
}

function createAttempt(
  subject: string,
  moduleName: string,
  score: number,
  total: number,
  completedAt: string,
  questionAttempts: AttemptQuestion[]
): PracticeAttempt {
  return {
    id: `attempt-${moduleName}-${completedAt}`,
    subjectName: subject,
    attemptNumber: 1,
    completedAt,
    moduleResults: [
      {
        moduleId: moduleName.toLowerCase().replace(/\s+/g, '-'),
        moduleName,
        score,
        total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        avgTimePerQuestion: 60,
        questionAttempts,
      },
    ],
    overallScore: score,
    overallTotal: total,
    overallPercentage: total > 0 ? Math.round((score / total) * 100) : 0,
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: score / total >= 0.8 ? 'High' : score / total >= 0.6 ? 'Medium' : 'Low',
  };
}

function generateQuestions(subject: string, count: number): Question[] {
  const difficulties: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];
  return Array.from({ length: count }, (_, i) =>
    createQuestion(`${subject}-q${i}`, difficulties[i % 3], subject)
  );
}

describe('computeStudyRecommendation', () => {
  it('prioritizes the weakest module (lowest accuracy)', () => {
    const subjects = [
      'Corporate Issuers', 'Fixed Income', 'Equity Investments',
      'Quantitative Methods', 'Economics', 'Financial Statement Analysis',
      'Derivatives', 'Alternative Investments', 'Portfolio Management',
      'Ethical and Professional Standards',
    ];
    const questions: Question[] = [];
    for (const subj of subjects) {
      questions.push(...generateQuestions(subj, 30));
    }

    // Create attempts for all subjects: Corporate Issuers weakest (40%), others high
    const now = new Date().toISOString();
    const attempts: PracticeAttempt[] = subjects.map(subj => {
      const score = subj === 'Corporate Issuers' ? 4 : 9;
      return createAttempt(
        subj,
        subj,
        score,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`${subj}-q${i}`, i < score)
        )
      );
    });

    const result = computeStudyRecommendation(attempts, questions);
    expect(result.recommendedModule).toBe('Corporate Issuers');
  });

  it('applies recency decay (longer since practice = higher priority)', () => {
    const subjects = [
      'Corporate Issuers', 'Fixed Income', 'Equity Investments',
      'Quantitative Methods', 'Economics', 'Financial Statement Analysis',
      'Derivatives', 'Alternative Investments', 'Portfolio Management',
      'Ethical and Professional Standards',
    ];
    const questions: Question[] = [];
    for (const subj of subjects) {
      questions.push(...generateQuestions(subj, 30));
    }

    // All modules have same accuracy (60%), but Corporate Issuers was practiced 20 days ago
    // Everyone else was practiced today
    const today = new Date().toISOString();
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const attempts: PracticeAttempt[] = subjects.map(subj => {
      const completedAt = subj === 'Corporate Issuers' ? twentyDaysAgo : today;
      return createAttempt(
        subj,
        subj,
        6,
        10,
        completedAt,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`${subj}-q${i}`, i < 6)
        )
      );
    });

    const result = computeStudyRecommendation(attempts, questions);
    // Corporate Issuers should score higher due to recency decay
    // (same accuracy, but much more time since practice)
    expect(result.recommendedModule).toBe('Corporate Issuers');
  });

  it('respects difficulty readiness (Easy>80% recommends Medium)', () => {
    // Create questions for multiple subjects
    const subjects = [
      'Corporate Issuers', 'Fixed Income', 'Equity Investments',
      'Quantitative Methods', 'Economics', 'Financial Statement Analysis',
      'Derivatives', 'Alternative Investments', 'Portfolio Management',
      'Ethical and Professional Standards',
    ];
    const questions: Question[] = [];
    for (const subj of subjects) {
      questions.push(...generateQuestions(subj, 30));
    }

    const now = new Date().toISOString();
    // Corporate Issuers: mix of Easy and Medium questions
    // Easy: q0, q3, q6, q9, q12 (5 Easy questions, all correct = 100% Easy accuracy)
    // Medium: q1, q4, q7, q10, q13 (5 Medium questions, 2 correct = 40% Medium accuracy)
    // Overall: 7/10 = 70%
    const ciEasyIds = [0, 3, 6, 9, 12].map(i => `Corporate Issuers-q${i}`);
    const ciMediumIds = [1, 4, 7, 10, 13].map(i => `Corporate Issuers-q${i}`);
    const ciAttemptQs: AttemptQuestion[] = [
      ...ciEasyIds.map(id => createAttemptQuestion(id, true)), // 5/5 Easy correct = 100%
      ...ciMediumIds.map((id, i) => createAttemptQuestion(id, i < 2)), // 2/5 Medium correct = 40%
    ];
    const ciAttempt = createAttempt('Corporate Issuers', 'Corporate Issuers', 7, 10, now, ciAttemptQs);

    // Other subjects: all perfect, using Easy question IDs
    const otherAttempts = subjects
      .filter(s => s !== 'Corporate Issuers')
      .map(subj => createAttempt(
        subj, subj, 10, 10, now,
        Array.from({ length: 10 }, (_, i) => createAttemptQuestion(`${subj}-q${i * 3}`, true))
      ));

    const attempts = [ciAttempt, ...otherAttempts];
    const result = computeStudyRecommendation(attempts, questions);

    // Corporate Issuers should be recommended (lowest accuracy at 70%)
    expect(result.recommendedModule).toBe('Corporate Issuers');
    // With 100% accuracy on Easy questions (>80%), should recommend Medium
    expect(['Medium', 'Hard']).toContain(result.recommendedDifficulty);
  });

  it('produces question count between 10 and 30', () => {
    const questions = generateQuestions('Corporate Issuers', 50);
    const now = new Date().toISOString();

    const attempts: PracticeAttempt[] = [
      createAttempt(
        'Corporate Issuers',
        'Corporate Issuers',
        5,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Corporate Issuers-q${i}`, i < 5)
        )
      ),
    ];

    const result = computeStudyRecommendation(attempts, questions);
    expect(result.recommendedQuestionCount).toBeGreaterThanOrEqual(10);
    expect(result.recommendedQuestionCount).toBeLessThanOrEqual(30);
  });

  it('includes the module name and a metric in reasoning string', () => {
    const questions = generateQuestions('Corporate Issuers', 30);
    const now = new Date().toISOString();

    const attempts: PracticeAttempt[] = [
      createAttempt(
        'Corporate Issuers',
        'Corporate Issuers',
        5,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Corporate Issuers-q${i}`, i < 5)
        )
      ),
    ];

    const result = computeStudyRecommendation(attempts, questions);
    expect(result.reasoning).toContain(result.recommendedModule);
    // Should include a percentage or numeric metric
    expect(result.reasoning).toMatch(/\d+%/);
  });

  it('returns a valid recommendation with all required fields', () => {
    const questions = generateQuestions('Quantitative Methods', 20);
    const now = new Date().toISOString();

    const attempts: PracticeAttempt[] = [
      createAttempt(
        'Quantitative Methods',
        'Quantitative Methods',
        7,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Quantitative Methods-q${i}`, i < 7)
        )
      ),
    ];

    const result = computeStudyRecommendation(attempts, questions);
    expect(result.recommendedModule).toBeTruthy();
    expect(['Easy', 'Medium', 'Hard']).toContain(result.recommendedDifficulty);
    expect(result.recommendedQuestionCount).toBeGreaterThanOrEqual(10);
    expect(result.recommendedQuestionCount).toBeLessThanOrEqual(30);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.reasoning).toBeTruthy();
  });
});

describe('getQuickRecommendations', () => {
  it('generates exactly 3 distinct options with different configurations', () => {
    const questions = [
      ...generateQuestions('Corporate Issuers', 30),
      ...generateQuestions('Fixed Income', 30),
      ...generateQuestions('Equity Investments', 30),
    ];

    const now = new Date().toISOString();
    const attempts: PracticeAttempt[] = [
      createAttempt(
        'Corporate Issuers',
        'Corporate Issuers',
        4,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Corporate Issuers-q${i}`, i < 4)
        )
      ),
      createAttempt(
        'Fixed Income',
        'Fixed Income',
        7,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Fixed Income-q${i}`, i < 7)
        )
      ),
      createAttempt(
        'Equity Investments',
        'Equity Investments',
        9,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Equity Investments-q${i}`, i < 9)
        )
      ),
    ];

    const options = getQuickRecommendations(attempts, questions);
    expect(options).toHaveLength(3);

    // Each option should have distinct title
    const titles = options.map(o => o.title);
    expect(new Set(titles).size).toBe(3);

    // Should be: Weakness Blitz, Balanced Review, Challenge Mode
    expect(titles).toContain('Weakness Blitz');
    expect(titles).toContain('Balanced Review');
    expect(titles).toContain('Challenge Mode');

    // Question counts should differ
    const counts = options.map(o => o.questionCount);
    expect(counts[0]).toBe(10); // Weakness Blitz
    expect(counts[1]).toBe(20); // Balanced Review
    expect(counts[2]).toBe(15); // Challenge Mode
  });

  it('Weakness Blitz targets the weakest module', () => {
    const subjects = [
      'Corporate Issuers', 'Fixed Income', 'Equity Investments',
      'Quantitative Methods', 'Economics', 'Financial Statement Analysis',
      'Derivatives', 'Alternative Investments', 'Portfolio Management',
      'Ethical and Professional Standards',
    ];
    const questions: Question[] = [];
    for (const subj of subjects) {
      questions.push(...generateQuestions(subj, 30));
    }

    const now = new Date().toISOString();
    const attempts: PracticeAttempt[] = subjects.map(subj => {
      const score = subj === 'Corporate Issuers' ? 3 : 9;
      return createAttempt(
        subj,
        subj,
        score,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`${subj}-q${i}`, i < score)
        )
      );
    });

    const options = getQuickRecommendations(attempts, questions);
    const weaknessBlitz = options.find(o => o.title === 'Weakness Blitz')!;
    expect(weaknessBlitz.module).toBe('Corporate Issuers');
  });

  it('Challenge Mode targets the best-performing module', () => {
    const subjects = [
      'Corporate Issuers', 'Fixed Income', 'Equity Investments',
      'Quantitative Methods', 'Economics', 'Financial Statement Analysis',
      'Derivatives', 'Alternative Investments', 'Portfolio Management',
      'Ethical and Professional Standards',
    ];
    const questions: Question[] = [];
    for (const subj of subjects) {
      questions.push(...generateQuestions(subj, 30));
    }

    const now = new Date().toISOString();
    const attempts: PracticeAttempt[] = subjects.map(subj => {
      const score = subj === 'Equity Investments' ? 10 : 5;
      return createAttempt(
        subj,
        subj,
        score,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`${subj}-q${i}`, i < score)
        )
      );
    });

    const options = getQuickRecommendations(attempts, questions);
    const challengeMode = options.find(o => o.title === 'Challenge Mode')!;
    expect(challengeMode.module).toBe('Equity Investments');
  });

  it('all options have valid estimated minutes', () => {
    const questions = generateQuestions('Corporate Issuers', 30);
    const now = new Date().toISOString();

    const attempts: PracticeAttempt[] = [
      createAttempt(
        'Corporate Issuers',
        'Corporate Issuers',
        5,
        10,
        now,
        Array.from({ length: 10 }, (_, i) =>
          createAttemptQuestion(`Corporate Issuers-q${i}`, i < 5)
        )
      ),
    ];

    const options = getQuickRecommendations(attempts, questions);
    for (const option of options) {
      expect(option.estimatedMinutes).toBeGreaterThan(0);
    }
  });
});
