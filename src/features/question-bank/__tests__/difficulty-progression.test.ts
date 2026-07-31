import { describe, it, expect } from 'vitest';
import {
  computeDifficultyStats,
  generateDifficultyHeatmapData,
  computeReadinessRecommendation,
} from '../utils/difficulty-progression';
import type { PracticeAttempt, AttemptQuestion } from '../types/attempt';
import type { Question } from '../types';

function createQuestion(id: string, difficulty: 'Easy' | 'Medium' | 'Hard', subject: string = 'Corporate Issuers'): Question {
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

function createAttempt(moduleResults: PracticeAttempt['moduleResults']): PracticeAttempt {
  const total = moduleResults.reduce((sum, m) => sum + m.total, 0);
  const score = moduleResults.reduce((sum, m) => sum + m.score, 0);
  return {
    id: 'test-attempt',
    subjectName: 'Corporate Issuers',
    attemptNumber: 1,
    completedAt: '2025-01-15T10:00:00Z',
    moduleResults,
    overallScore: score,
    overallTotal: total,
    overallPercentage: total > 0 ? Math.round((score / total) * 100) : 0,
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: 'High',
  };
}

describe('computeDifficultyStats', () => {
  it('should compute per-module per-difficulty accuracy', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Easy'),
      createQuestion('q-3', 'Medium'),
      createQuestion('q-4', 'Hard'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Capital Structure',
          score: 3,
          total: 4,
          percentage: 75,
          avgTimePerQuestion: 60,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
            createAttemptQuestion('q-3', true),
            createAttemptQuestion('q-4', false),
          ],
        },
      ]),
    ];

    const result = computeDifficultyStats(attempts, questions);

    expect(result.modules).toHaveLength(1);
    const module = result.modules[0];
    expect(module.moduleName).toBe('Capital Structure');
    expect(module.easy.correct).toBe(2);
    expect(module.easy.total).toBe(2);
    expect(module.easy.accuracy).toBe(100);
    expect(module.medium.correct).toBe(1);
    expect(module.medium.total).toBe(1);
    expect(module.medium.accuracy).toBe(100);
    expect(module.hard.correct).toBe(0);
    expect(module.hard.total).toBe(1);
    expect(module.hard.accuracy).toBe(0);
  });

  it('should compute overall difficulty stats', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Medium'),
      createQuestion('q-3', 'Hard'),
      createQuestion('q-4', 'Easy'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Module A',
          score: 2,
          total: 2,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
          ],
        },
        {
          moduleId: 'mod-2',
          moduleName: 'Module B',
          score: 1,
          total: 2,
          percentage: 50,
          avgTimePerQuestion: 70,
          questionAttempts: [
            createAttemptQuestion('q-3', false),
            createAttemptQuestion('q-4', true),
          ],
        },
      ]),
    ];

    const result = computeDifficultyStats(attempts, questions);

    expect(result.overall.easy.correct).toBe(2);
    expect(result.overall.easy.total).toBe(2);
    expect(result.overall.easy.accuracy).toBe(100);
    expect(result.overall.medium.correct).toBe(1);
    expect(result.overall.medium.total).toBe(1);
    expect(result.overall.medium.accuracy).toBe(100);
    expect(result.overall.hard.correct).toBe(0);
    expect(result.overall.hard.total).toBe(1);
    expect(result.overall.hard.accuracy).toBe(0);
  });

  it('should handle empty attempts', () => {
    const result = computeDifficultyStats([], []);
    expect(result.modules).toHaveLength(0);
    expect(result.overall.easy.total).toBe(0);
    expect(result.overall.medium.total).toBe(0);
    expect(result.overall.hard.total).toBe(0);
  });

  it('should default to Medium when question not found', () => {
    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Unknown Module',
          score: 1,
          total: 1,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('unknown-q', true),
          ],
        },
      ]),
    ];

    const result = computeDifficultyStats(attempts, []);
    expect(result.modules[0].medium.total).toBe(1);
    expect(result.modules[0].medium.correct).toBe(1);
  });

  it('should aggregate across multiple attempts', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Easy'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Module A',
          score: 1,
          total: 1,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [createAttemptQuestion('q-1', true)],
        },
      ]),
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Module A',
          score: 0,
          total: 1,
          percentage: 0,
          avgTimePerQuestion: 50,
          questionAttempts: [createAttemptQuestion('q-2', false)],
        },
      ]),
    ];

    const result = computeDifficultyStats(attempts, questions);
    expect(result.modules[0].easy.correct).toBe(1);
    expect(result.modules[0].easy.total).toBe(2);
    expect(result.modules[0].easy.accuracy).toBe(50);
  });
});

describe('generateDifficultyHeatmapData', () => {
  it('should produce heatmap data from stats', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Medium'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Capital Structure',
          score: 2,
          total: 2,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
          ],
        },
      ]),
    ];

    const stats = computeDifficultyStats(attempts, questions);
    const heatmap = generateDifficultyHeatmapData(stats);

    expect(heatmap.rows).toEqual(['Capital Structure']);
    expect(heatmap.columns).toEqual(['Easy', 'Medium', 'Hard']);
    expect(heatmap.cells).toHaveLength(3);

    const easyCell = heatmap.cells.find(c => c.difficulty === 'Easy');
    expect(easyCell?.accuracy).toBe(100);
    expect(easyCell?.total).toBe(1);
  });
});

describe('computeReadinessRecommendation', () => {
  it('should recommend Medium when Easy > 80%', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Easy'),
      createQuestion('q-3', 'Easy'),
      createQuestion('q-4', 'Easy'),
      createQuestion('q-5', 'Easy'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Capital Structure',
          score: 5,
          total: 5,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
            createAttemptQuestion('q-3', true),
            createAttemptQuestion('q-4', true),
            createAttemptQuestion('q-5', true),
          ],
        },
      ]),
    ];

    const stats = computeDifficultyStats(attempts, questions);
    const recommendations = computeReadinessRecommendation(stats);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].level).toBe('ready_for_medium');
    expect(recommendations[0].targetDifficulty).toBe('Medium');
    expect(recommendations[0].message).toContain('Ready for Medium');
  });

  it('should recommend Hard when Medium > 75%', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Medium'),
      createQuestion('q-3', 'Medium'),
      createQuestion('q-4', 'Medium'),
      createQuestion('q-5', 'Medium'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Capital Structure',
          score: 5,
          total: 5,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
            createAttemptQuestion('q-3', true),
            createAttemptQuestion('q-4', true),
            createAttemptQuestion('q-5', true),
          ],
        },
      ]),
    ];

    const stats = computeDifficultyStats(attempts, questions);
    const recommendations = computeReadinessRecommendation(stats);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].level).toBe('ready_for_hard');
    expect(recommendations[0].targetDifficulty).toBe('Hard');
    expect(recommendations[0].message).toContain('Ready for Hard');
  });

  it('should recommend mastering Easy when accuracy <= 80%', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Easy'),
      createQuestion('q-3', 'Easy'),
      createQuestion('q-4', 'Easy'),
      createQuestion('q-5', 'Easy'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Capital Structure',
          score: 3,
          total: 5,
          percentage: 60,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
            createAttemptQuestion('q-3', true),
            createAttemptQuestion('q-4', false),
            createAttemptQuestion('q-5', false),
          ],
        },
      ]),
    ];

    const stats = computeDifficultyStats(attempts, questions);
    const recommendations = computeReadinessRecommendation(stats);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].level).toBe('master_easy');
    expect(recommendations[0].message).toContain('Master Easy');
  });

  it('should mark mastered_all when Hard >= 75%', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Hard'),
      createQuestion('q-2', 'Hard'),
      createQuestion('q-3', 'Hard'),
      createQuestion('q-4', 'Hard'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Capital Structure',
          score: 4,
          total: 4,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
            createAttemptQuestion('q-3', true),
            createAttemptQuestion('q-4', true),
          ],
        },
      ]),
    ];

    const stats = computeDifficultyStats(attempts, questions);
    const recommendations = computeReadinessRecommendation(stats);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].level).toBe('mastered_all');
    expect(recommendations[0].targetDifficulty).toBeNull();
  });

  it('should handle multiple modules with different readiness levels', () => {
    const questions: Question[] = [
      createQuestion('q-1', 'Easy'),
      createQuestion('q-2', 'Easy'),
      createQuestion('q-3', 'Medium'),
      createQuestion('q-4', 'Medium'),
    ];

    const attempts: PracticeAttempt[] = [
      createAttempt([
        {
          moduleId: 'mod-1',
          moduleName: 'Module A',
          score: 2,
          total: 2,
          percentage: 100,
          avgTimePerQuestion: 50,
          questionAttempts: [
            createAttemptQuestion('q-1', true),
            createAttemptQuestion('q-2', true),
          ],
        },
        {
          moduleId: 'mod-2',
          moduleName: 'Module B',
          score: 1,
          total: 2,
          percentage: 50,
          avgTimePerQuestion: 70,
          questionAttempts: [
            createAttemptQuestion('q-3', true),
            createAttemptQuestion('q-4', false),
          ],
        },
      ]),
    ];

    const stats = computeDifficultyStats(attempts, questions);
    const recommendations = computeReadinessRecommendation(stats);

    expect(recommendations).toHaveLength(2);
    const modA = recommendations.find(r => r.moduleName === 'Module A');
    const modB = recommendations.find(r => r.moduleName === 'Module B');
    expect(modA?.level).toBe('ready_for_medium');
    expect(modB?.level).toBe('master_medium');
  });
});
