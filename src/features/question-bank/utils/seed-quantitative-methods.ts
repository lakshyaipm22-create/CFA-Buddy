import { quantitativeMethodsModules } from '../data/quantitative-methods';
import type { PracticeAttempt, AttemptQuestion, ModuleResult } from '../types/attempt';
import { computeConfidenceLevel } from '../types/attempt';
import { getAttempts, saveAttempt } from './attempt-storage';

const SEED_ATTEMPT_ID = 'qm-attempt-1';

interface ModuleScoreConfig {
  moduleKey: keyof typeof quantitativeMethodsModules;
  moduleId: string;
  score: number;
  total: number;
  avgTime: number;
}

const moduleScores: ModuleScoreConfig[] = [
  { moduleKey: 'module1', moduleId: 'qm-m1', score: 44, total: 55, avgTime: 125 },
  { moduleKey: 'module2', moduleId: 'qm-m2', score: 16, total: 21, avgTime: 167 },
  { moduleKey: 'module3', moduleId: 'qm-m3', score: 29, total: 37, avgTime: 78 },
  { moduleKey: 'module4', moduleId: 'qm-m4', score: 9, total: 11, avgTime: 135 },
  { moduleKey: 'module5', moduleId: 'qm-m5', score: 13, total: 15, avgTime: 176 },
  { moduleKey: 'module6', moduleId: 'qm-m6', score: 10, total: 11, avgTime: 16 },
  { moduleKey: 'module7', moduleId: 'qm-m7', score: 19, total: 27, avgTime: 38 },
  { moduleKey: 'module8', moduleId: 'qm-m8', score: 28, total: 43, avgTime: 30 },
  { moduleKey: 'module9', moduleId: 'qm-m9', score: 5, total: 7, avgTime: 32 },
  { moduleKey: 'module10', moduleId: 'qm-m10', score: 43, total: 49, avgTime: 75 },
  { moduleKey: 'module11', moduleId: 'qm-m11', score: 10, total: 14, avgTime: 22 },
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
  moduleKey: keyof typeof quantitativeMethodsModules,
  score: number,
  total: number,
  avgTime: number,
  rng: () => number
): AttemptQuestion[] {
  const moduleData = quantitativeMethodsModules[moduleKey];
  const questions = moduleData.questions;
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

    // Time centered around avgTime with some variation
    const timeVariation = avgTime * 0.5;
    const timeSpent = Math.max(10, Math.round(avgTime + (rng() - 0.5) * 2 * timeVariation));

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
 * Seeds a Quantitative Methods practice attempt with deterministic scores.
 * Checks if already seeded before creating to prevent duplicates.
 */
export function seedQuantitativeMethodsAttempt(): PracticeAttempt {
  const existing = getAttempts('Quantitative Methods');
  const alreadySeeded = existing.find(a => a.id === SEED_ATTEMPT_ID);
  if (alreadySeeded) {
    return alreadySeeded;
  }

  const rng = createSeededRandom(389);

  const moduleResults: ModuleResult[] = moduleScores.map(config => {
    const attempts = generateModuleAttempts(
      config.moduleKey,
      config.score,
      config.total,
      config.avgTime,
      rng
    );
    const totalTime = attempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    const percentage = Math.round((config.score / config.total) * 100);

    return {
      moduleId: config.moduleId,
      moduleName: quantitativeMethodsModules[config.moduleKey].name,
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
    subjectName: 'Quantitative Methods',
    attemptNumber: 1,
    completedAt: new Date('2025-01-22T10:30:00Z').toISOString(),
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
