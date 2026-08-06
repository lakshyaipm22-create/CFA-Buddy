import { alternativeInvestmentsModules } from '../data/alternative-investments';
import type { PracticeAttempt, AttemptQuestion, ModuleResult } from '../types/attempt';
import { computeConfidenceLevel } from '../types/attempt';
import { getAttempts, saveAttempt } from './attempt-storage';

const SEED_ATTEMPT_ID = 'ai-attempt-1';

interface ModuleScoreConfig {
  moduleKey: keyof typeof alternativeInvestmentsModules;
  moduleId: string;
  score: number;
  total: number;
  avgTime: number;
}

const moduleScores: ModuleScoreConfig[] = [
  { moduleKey: 'module1', moduleId: 'ai-m1', score: 28, total: 35, avgTime: 18 },
  { moduleKey: 'module2', moduleId: 'ai-m2', score: 24, total: 31, avgTime: 135 },
  { moduleKey: 'module3', moduleId: 'ai-m3', score: 20, total: 25, avgTime: 23 },
  { moduleKey: 'module4', moduleId: 'ai-m4', score: 21, total: 26, avgTime: 31 },
  { moduleKey: 'module5', moduleId: 'ai-m5', score: 13, total: 15, avgTime: 23 },
  { moduleKey: 'module6', moduleId: 'ai-m6', score: 14, total: 20, avgTime: 45 },
  { moduleKey: 'module7', moduleId: 'ai-m7', score: 16, total: 20, avgTime: 51 },
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
  moduleKey: keyof typeof alternativeInvestmentsModules,
  score: number,
  total: number,
  avgTime: number,
  rng: () => number
): AttemptQuestion[] {
  const moduleData = alternativeInvestmentsModules[moduleKey];
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
 * Seeds an Alternative Investments practice attempt with deterministic scores.
 * Checks if already seeded before creating to prevent duplicates.
 */
export function seedAlternativeInvestmentsAttempt(): PracticeAttempt {
  const existing = getAttempts('Alternative Investments');
  const alreadySeeded = existing.find(a => a.id === SEED_ATTEMPT_ID);
  if (alreadySeeded) {
    return alreadySeeded;
  }

  const rng = createSeededRandom(512);

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
      moduleName: alternativeInvestmentsModules[config.moduleKey].name,
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
    subjectName: 'Alternative Investments',
    attemptNumber: 1,
    completedAt: new Date('2025-01-25T14:15:00Z').toISOString(),
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
