import { fixedIncomeModules } from '../data/fixed-income';
import type { PracticeAttempt, AttemptQuestion, ModuleResult } from '../types/attempt';
import { computeConfidenceLevel } from '../types/attempt';
import { getAttempts, saveAttempt } from './attempt-storage';

const SEED_ATTEMPT_ID = 'fi-attempt-1';

interface ModuleScoreConfig {
  moduleKey: keyof typeof fixedIncomeModules;
  moduleId: string;
  score: number;
  total: number;
  wrongIndices: number[];
}

const moduleScores: ModuleScoreConfig[] = [
  { moduleKey: 'module1', moduleId: 'fi-m1', score: 9, total: 11, wrongIndices: [5, 6] },
  { moduleKey: 'module2', moduleId: 'fi-m2', score: 14, total: 16, wrongIndices: [10, 13] },
  { moduleKey: 'module3', moduleId: 'fi-m3', score: 5, total: 6, wrongIndices: [5] },
  { moduleKey: 'module4', moduleId: 'fi-m4', score: 4, total: 7, wrongIndices: [1, 2, 4] },
  { moduleKey: 'module5', moduleId: 'fi-m5', score: 5, total: 8, wrongIndices: [0, 2, 7] },
  { moduleKey: 'module6', moduleId: 'fi-m6', score: 20, total: 24, wrongIndices: [0, 2, 6, 17] },
  { moduleKey: 'module7', moduleId: 'fi-m7', score: 8, total: 15, wrongIndices: [0, 1, 2, 4, 6, 7, 13] },
  { moduleKey: 'module8', moduleId: 'fi-m8', score: 12, total: 14, wrongIndices: [9, 13] },
  { moduleKey: 'module9', moduleId: 'fi-m9', score: 19, total: 23, wrongIndices: [0, 4, 8, 9] },
  { moduleKey: 'module10', moduleId: 'fi-m10', score: 18, total: 25, wrongIndices: [0, 1, 4, 6, 9, 17, 18] },
  { moduleKey: 'module11', moduleId: 'fi-m11', score: 18, total: 26, wrongIndices: [5, 9, 10, 11, 12, 13, 14, 19] },
  { moduleKey: 'module12', moduleId: 'fi-m12', score: 18, total: 28, wrongIndices: [0, 3, 5, 6, 8, 10, 15, 19, 20, 27] },
  { moduleKey: 'module13', moduleId: 'fi-m13', score: 26, total: 33, wrongIndices: [2, 7, 11, 16, 23, 24, 26] },
  { moduleKey: 'module14', moduleId: 'fi-m14', score: 10, total: 13, wrongIndices: [0, 1, 3] },
  { moduleKey: 'module15', moduleId: 'fi-m15', score: 7, total: 7, wrongIndices: [] },
  { moduleKey: 'module16', moduleId: 'fi-m16', score: 16, total: 20, wrongIndices: [0, 3, 15, 19] },
  { moduleKey: 'module18', moduleId: 'fi-m18', score: 9, total: 17, wrongIndices: [0, 5, 9, 10, 11, 12, 13, 14] },
  { moduleKey: 'module19', moduleId: 'fi-m19', score: 21, total: 23, wrongIndices: [3, 16] },
];

/**
 * Simple pseudo-random number generator (seeded) to produce deterministic results
 * for test reproducibility.
 */
function createSeededRandom(seed: number) {
  let s = seed;
  return function next(): number {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateModuleAttempts(
  moduleKey: keyof typeof fixedIncomeModules,
  wrongIndices: number[],
  rng: () => number
): AttemptQuestion[] {
  const moduleData = fixedIncomeModules[moduleKey];
  const questions = moduleData.questions;

  const wrongSet = new Set(wrongIndices);

  return questions.map((q, idx): AttemptQuestion => {
    const isCorrect = !wrongSet.has(idx);
    const correctChoice = q.answerChoices.find(c => c.isCorrect);
    let selectedAnswer: string;

    if (isCorrect) {
      selectedAnswer = correctChoice?.label ?? 'A';
    } else {
      // Pick a wrong answer using RNG
      const wrongChoices = q.answerChoices.filter(c => !c.isCorrect);
      const wrongIdx = Math.floor(rng() * wrongChoices.length);
      selectedAnswer = wrongChoices[wrongIdx].label;
    }

    // Time between 45 and 150 seconds
    const timeSpent = Math.round(45 + rng() * 105);

    // Confidence correlates with correctness but not perfectly
    let confidence: 'High' | 'Medium' | 'Low';
    const confRoll = rng();
    if (isCorrect) {
      confidence = confRoll < 0.6 ? 'High' : confRoll < 0.9 ? 'Medium' : 'Low';
    } else {
      confidence = confRoll < 0.2 ? 'High' : confRoll < 0.6 ? 'Medium' : 'Low';
    }

    return {
      questionId: q.id,
      selectedAnswer,
      correct: isCorrect,
      timeSpentSeconds: timeSpent,
      confidence,
    };
  });
}

/**
 * Seeds a Fixed Income practice attempt with specific wrong questions.
 * Checks if already seeded before creating to prevent duplicates.
 */
export function seedFixedIncomeAttempt(): PracticeAttempt {
  const existing = getAttempts('Fixed Income');
  const alreadySeeded = existing.find(a => a.id === SEED_ATTEMPT_ID);
  if (alreadySeeded) {
    return alreadySeeded;
  }

  const rng = createSeededRandom(84);

  const moduleResults: ModuleResult[] = moduleScores.map(config => {
    const attempts = generateModuleAttempts(
      config.moduleKey,
      config.wrongIndices,
      rng
    );
    const totalTime = attempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    const percentage = Math.round((config.score / config.total) * 100);

    return {
      moduleId: config.moduleId,
      moduleName: fixedIncomeModules[config.moduleKey].name,
      score: config.score,
      total: config.total,
      percentage,
      avgTimePerQuestion: Math.round(totalTime / config.total),
      questionAttempts: attempts,
    };
  });

  const overallScore = moduleScores.reduce((sum, m) => sum + m.score, 0);
  const overallTotal = moduleScores.reduce((sum, m) => sum + m.total, 0);
  const overallPercentage = Math.round((overallScore / overallTotal) * 100);
  const totalTime = moduleResults.reduce(
    (sum, mr) => sum + mr.questionAttempts.reduce((s, a) => s + a.timeSpentSeconds, 0),
    0
  );

  const attempt: PracticeAttempt = {
    id: SEED_ATTEMPT_ID,
    subjectName: 'Fixed Income',
    attemptNumber: 1,
    completedAt: new Date('2025-01-20T16:45:00Z').toISOString(),
    moduleResults,
    overallScore,
    overallTotal,
    overallPercentage,
    avgTimePerQuestion: Math.round(totalTime / overallTotal),
    bookmarkedIds: [],
    confidenceLevel: computeConfidenceLevel(overallPercentage),
  };

  saveAttempt(attempt);
  return attempt;
}
