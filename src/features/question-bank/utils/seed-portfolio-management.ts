import { portfolioManagementModules } from '../data/portfolio-management';
import type { PracticeAttempt, AttemptQuestion, ModuleResult } from '../types/attempt';
import { computeConfidenceLevel } from '../types/attempt';
import { getAttempts, saveAttempt } from './attempt-storage';

const SEED_ATTEMPT_ID = 'pm-attempt-1';

interface ModuleScoreConfig {
  moduleKey: keyof typeof portfolioManagementModules;
  moduleId: string;
  score: number;
  total: number;
}

const moduleScores: ModuleScoreConfig[] = [
  { moduleKey: 'module1', moduleId: 'pm-m1', score: 38, total: 56 },
  { moduleKey: 'module2', moduleId: 'pm-m2', score: 75, total: 93 },
  { moduleKey: 'module3', moduleId: 'pm-m3', score: 30, total: 40 },
  { moduleKey: 'module4', moduleId: 'pm-m4', score: 50, total: 55 },
  { moduleKey: 'module5', moduleId: 'pm-m5', score: 20, total: 27 },
  { moduleKey: 'module6', moduleId: 'pm-m6', score: 31, total: 41 },
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
  moduleKey: keyof typeof portfolioManagementModules,
  score: number,
  total: number,
  rng: () => number
): AttemptQuestion[] {
  const mod = portfolioManagementModules[moduleKey];
  const questions = mod.questions;
  const incorrect = total - score;

  // Pick which question indices will be incorrect
  const incorrectIndices = new Set<number>();
  const indices = Array.from({ length: total }, (_, i) => i);

  // Shuffle and pick the first `incorrect` indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < incorrect; i++) {
    incorrectIndices.add(indices[i]);
  }

  return questions.map((q, idx): AttemptQuestion => {
    const isCorrect = !incorrectIndices.has(idx);
    const correctChoice = q.answerChoices.find(c => c.isCorrect);
    let selectedAnswer: string;

    if (isCorrect) {
      selectedAnswer = correctChoice?.label ?? 'A';
    } else {
      // Pick a wrong answer
      const wrongChoices = q.answerChoices.filter(c => !c.isCorrect);
      const wrongIdx = Math.floor(rng() * wrongChoices.length);
      selectedAnswer = wrongChoices[wrongIdx].label;
    }

    // Time between 45 and 150 seconds, normally distributed around 75-90
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
 * Seeds a Portfolio Management practice attempt with the user's actual scores.
 * Checks if already seeded before creating to prevent duplicates.
 */
export function seedPortfolioManagementAttempt(): PracticeAttempt {
  const existing = getAttempts('Portfolio Management');
  const alreadySeeded = existing.find(a => a.id === SEED_ATTEMPT_ID);
  if (alreadySeeded) {
    return alreadySeeded;
  }

  const rng = createSeededRandom(256);

  const moduleResults: ModuleResult[] = moduleScores.map(config => {
    const attempts = generateModuleAttempts(
      config.moduleKey,
      config.score,
      config.total,
      rng
    );
    const totalTime = attempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    const percentage = Math.round((config.score / config.total) * 100);

    return {
      moduleId: config.moduleId,
      moduleName: portfolioManagementModules[config.moduleKey].name,
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
    subjectName: 'Portfolio Management',
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
