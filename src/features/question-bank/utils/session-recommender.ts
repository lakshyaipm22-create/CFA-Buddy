/**
 * Study Session Recommendation Engine
 * Analyzes attempt data, curriculum weights, recency, and difficulty readiness
 * to recommend optimal study sessions.
 */

import type { PracticeAttempt } from '../types/attempt';
import type { Question } from '../types';
import { CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import { computeDifficultyStats, computeReadinessRecommendation } from './difficulty-progression';

export interface StudyRecommendation {
  recommendedModule: string;
  recommendedDifficulty: 'Easy' | 'Medium' | 'Hard';
  recommendedQuestionCount: number;
  estimatedMinutes: number;
  reasoning: string;
}

export interface QuickOption {
  title: string;
  description: string;
  module: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  questionCount: number;
  estimatedMinutes: number;
}

interface ModuleScore {
  module: string;
  score: number;
  accuracy: number;
  daysSinceLastPractice: number;
  curriculumWeight: number;
}

/**
 * Get the number of days since a given ISO date string.
 */
function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

/**
 * Get per-module accuracy and recency from attempts.
 */
function getModuleMetrics(attempts: PracticeAttempt[]): Record<string, { accuracy: number; lastPracticed: string; totalQuestions: number }> {
  const metrics: Record<string, { correct: number; total: number; lastPracticed: string }> = {};

  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      const moduleName = moduleResult.moduleName;
      if (!metrics[moduleName]) {
        metrics[moduleName] = { correct: 0, total: 0, lastPracticed: '' };
      }
      metrics[moduleName].correct += moduleResult.score;
      metrics[moduleName].total += moduleResult.total;
      if (attempt.completedAt > metrics[moduleName].lastPracticed) {
        metrics[moduleName].lastPracticed = attempt.completedAt;
      }
    }
  }

  const result: Record<string, { accuracy: number; lastPracticed: string; totalQuestions: number }> = {};
  for (const [mod, data] of Object.entries(metrics)) {
    result[mod] = {
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      lastPracticed: data.lastPracticed,
      totalQuestions: data.total,
    };
  }
  return result;
}

/**
 * Compute a study recommendation based on all available data.
 * Algorithm: score each module by combining factors:
 * - Accuracy gap (lower accuracy = higher score)
 * - Curriculum weight (higher weight = higher priority)
 * - Recency decay (more days since last practice = higher score)
 * - Spaced rep due count (implicit via accuracy gap)
 */
export function computeStudyRecommendation(
  attempts: PracticeAttempt[],
  questions: Question[]
): StudyRecommendation {
  // Default fallback if no data
  if (attempts.length === 0) {
    const defaultModule = 'Ethical and Professional Standards';
    const available = questions.filter(q => q.subject === defaultModule);
    const count = Math.min(Math.max(10, available.length), 30);
    return {
      recommendedModule: defaultModule,
      recommendedDifficulty: 'Easy',
      recommendedQuestionCount: count > 0 ? count : 15,
      estimatedMinutes: Math.round((count > 0 ? count : 15) * 1.5),
      reasoning: `Start with ${defaultModule} as it has the highest exam weight (15%) and builds your ethical foundation.`,
    };
  }

  const moduleMetrics = getModuleMetrics(attempts);
  const practicedModules = Object.keys(moduleMetrics);
  const moduleScores: ModuleScore[] = [];

  // Score each module in the curriculum
  for (const [module, weight] of Object.entries(CFA_CURRICULUM_WEIGHTS)) {
    const metrics = moduleMetrics[module];
    const hasPracticeData = !!metrics && metrics.totalQuestions > 0;
    const accuracy = metrics?.accuracy ?? 50; // default 50% for unpracticed modules
    const lastPracticed = metrics?.lastPracticed ?? '';
    const days = lastPracticed ? daysSince(lastPracticed) : 30; // default 30 days if never practiced

    // Accuracy gap: lower accuracy means higher need to practice (100 - accuracy)
    const accuracyGap = 100 - accuracy;

    // Recency decay: logarithmic growth so it caps out, but rewards revisiting old modules
    const recencyFactor = Math.min(Math.log2(days + 1) / Math.log2(31), 1.0); // normalized 0-1

    // Curriculum weight factor: higher weight = more important
    const weightFactor = weight / 0.15; // normalized so max weight (0.15) = 1.0

    // Combined score: weighted sum
    // Practiced modules with low accuracy get a bonus to prioritize them over untested modules
    const practiceBonus = hasPracticeData ? 15 : 0;
    const combinedScore = (accuracyGap * 0.5) + (recencyFactor * 25) + (weightFactor * 15) + practiceBonus;

    moduleScores.push({
      module,
      score: combinedScore,
      accuracy: metrics?.accuracy ?? 0,
      daysSinceLastPractice: days,
      curriculumWeight: weight,
    });
  }

  // Sort by score descending
  moduleScores.sort((a, b) => b.score - a.score);
  const topModule = moduleScores[0];

  // Determine recommended difficulty based on readiness
  const diffStats = computeDifficultyStats(attempts, questions);
  const readiness = computeReadinessRecommendation(diffStats);
  const moduleReadiness = readiness.find(r => r.moduleName === topModule.module);

  let recommendedDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
  if (moduleReadiness) {
    if (moduleReadiness.targetDifficulty) {
      recommendedDifficulty = moduleReadiness.targetDifficulty;
    }
  } else {
    // No readiness data: check module stats from diffStats
    const moduleStats = diffStats.modules.find(m => m.moduleName === topModule.module);
    if (moduleStats) {
      if (moduleStats.easy.total > 0 && moduleStats.easy.accuracy > 80) {
        recommendedDifficulty = 'Medium';
      }
      if (moduleStats.medium.total > 0 && moduleStats.medium.accuracy > 75) {
        recommendedDifficulty = 'Hard';
      }
    }
  }

  // Determine question count (10-30) based on available questions at recommended difficulty
  const availableAtDifficulty = questions.filter(
    q => q.subject === topModule.module && q.difficulty === recommendedDifficulty
  ).length;
  const recommendedCount = Math.min(30, Math.max(10, availableAtDifficulty));

  // Estimated time: 1.5 minutes per question
  const estimatedMinutes = Math.round(recommendedCount * 1.5);

  // Build reasoning string
  const target = 80;
  const gap = target - topModule.accuracy;
  let reasoning: string;
  if (gap > 0) {
    reasoning = `${topModule.module} has the biggest gap (${topModule.accuracy}% vs ${target}% target) and ${Math.round(topModule.curriculumWeight * 100)}% exam weight.`;
  } else {
    reasoning = `${topModule.module} needs review after ${topModule.daysSinceLastPractice} days and carries ${Math.round(topModule.curriculumWeight * 100)}% exam weight.`;
  }

  return {
    recommendedModule: topModule.module,
    recommendedDifficulty,
    recommendedQuestionCount: recommendedCount,
    estimatedMinutes,
    reasoning,
  };
}

/**
 * Generate exactly 3 quick session recommendations:
 * 1. "Weakness Blitz" - focus hardest module, 10 Qs, estimated difficulty
 * 2. "Balanced Review" - pick 2 weak modules mixed, 20 Qs
 * 3. "Challenge Mode" - ready-to-advance difficulty for best-performing module, 15 Qs
 */
export function getQuickRecommendations(
  attempts: PracticeAttempt[],
  questions: Question[]
): [QuickOption, QuickOption, QuickOption] {
  const moduleMetrics = getModuleMetrics(attempts);

  // Sort modules by accuracy (ascending = weakest first)
  // Prioritize modules that have actually been practiced
  const practicedModules = Object.entries(CFA_CURRICULUM_WEIGHTS)
    .map(([module]) => ({
      module,
      accuracy: moduleMetrics[module]?.accuracy ?? 0,
      totalQuestions: moduleMetrics[module]?.totalQuestions ?? 0,
      hasPracticeData: !!(moduleMetrics[module] && moduleMetrics[module].totalQuestions > 0),
    }))
    .filter(m => m.hasPracticeData)
    .sort((a, b) => a.accuracy - b.accuracy);

  // If no modules have been practiced, fall back to all curriculum modules
  const scoredModules = practicedModules.length > 0
    ? practicedModules
    : Object.entries(CFA_CURRICULUM_WEIGHTS)
        .map(([module]) => ({
          module,
          accuracy: 0,
          totalQuestions: 0,
          hasPracticeData: false,
        }));

  // Determine difficulty for weakest module
  const weakestModule = scoredModules[0];
  const diffStats = computeDifficultyStats(attempts, questions);
  const weakModuleStats = diffStats.modules.find(m => m.moduleName === weakestModule.module);

  let weakDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
  if (weakModuleStats) {
    if (weakModuleStats.easy.total > 0 && weakModuleStats.easy.accuracy > 80) {
      weakDifficulty = 'Medium';
    }
    if (weakModuleStats.medium.total > 0 && weakModuleStats.medium.accuracy > 75) {
      weakDifficulty = 'Hard';
    }
  }

  // Best-performing module (highest accuracy)
  const bestModule = scoredModules[scoredModules.length - 1];
  const bestModuleStats = diffStats.modules.find(m => m.moduleName === bestModule.module);
  let challengeDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  if (bestModuleStats) {
    if (bestModuleStats.medium.total > 0 && bestModuleStats.medium.accuracy > 75) {
      challengeDifficulty = 'Hard';
    } else if (bestModuleStats.easy.total > 0 && bestModuleStats.easy.accuracy > 80) {
      challengeDifficulty = 'Medium';
    }
  }

  // Second weakest module for balanced review
  const secondWeakest = scoredModules.length > 1 ? scoredModules[1] : scoredModules[0];

  const weaknessBlitz: QuickOption = {
    title: 'Weakness Blitz',
    description: `Focus on ${weakestModule.module} (${weakestModule.accuracy}% accuracy)`,
    module: weakestModule.module,
    difficulty: weakDifficulty,
    questionCount: 10,
    estimatedMinutes: 15,
  };

  const balancedReview: QuickOption = {
    title: 'Balanced Review',
    description: `Mix of ${weakestModule.module} and ${secondWeakest.module}`,
    module: weakestModule.module,
    difficulty: 'Mixed',
    questionCount: 20,
    estimatedMinutes: 30,
  };

  const challengeMode: QuickOption = {
    title: 'Challenge Mode',
    description: `Push your limits in ${bestModule.module} (${bestModule.accuracy}% accuracy)`,
    module: bestModule.module,
    difficulty: challengeDifficulty,
    questionCount: 15,
    estimatedMinutes: 23,
  };

  return [weaknessBlitz, balancedReview, challengeMode];
}
