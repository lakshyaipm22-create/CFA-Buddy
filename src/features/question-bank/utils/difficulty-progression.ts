/**
 * Difficulty Progression Utilities
 * Functions for analyzing per-difficulty performance and generating readiness recommendations.
 */

import type { PracticeAttempt } from '../types/attempt';
import type { Question } from '../types';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface DifficultyModuleStats {
  moduleName: string;
  easy: { correct: number; total: number; accuracy: number };
  medium: { correct: number; total: number; accuracy: number };
  hard: { correct: number; total: number; accuracy: number };
}

export interface DifficultyStats {
  modules: DifficultyModuleStats[];
  overall: {
    easy: { correct: number; total: number; accuracy: number };
    medium: { correct: number; total: number; accuracy: number };
    hard: { correct: number; total: number; accuracy: number };
  };
}

export interface HeatmapCell {
  moduleName: string;
  difficulty: DifficultyLevel;
  accuracy: number;
  total: number;
  correct: number;
}

export interface HeatmapData {
  rows: string[];
  columns: DifficultyLevel[];
  cells: HeatmapCell[];
}

export type ReadinessLevel = 'ready_for_medium' | 'ready_for_hard' | 'master_easy' | 'master_medium' | 'mastered_all';

export interface ReadinessRecommendation {
  moduleName: string;
  level: ReadinessLevel;
  message: string;
  currentAccuracy: number;
  targetDifficulty: DifficultyLevel | null;
}

/**
 * Compute per-module, per-difficulty accuracy stats from practice attempts.
 * Matches question IDs from attempts with question metadata to determine difficulty.
 */
export function computeDifficultyStats(
  attempts: PracticeAttempt[],
  questions: Question[]
): DifficultyStats {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  // Aggregate data: moduleName -> difficulty -> { correct, total }
  const moduleData: Record<string, Record<DifficultyLevel, { correct: number; total: number }>> = {};
  const overallData: Record<DifficultyLevel, { correct: number; total: number }> = {
    Easy: { correct: 0, total: 0 },
    Medium: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 },
  };

  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      const moduleName = moduleResult.moduleName;

      if (!moduleData[moduleName]) {
        moduleData[moduleName] = {
          Easy: { correct: 0, total: 0 },
          Medium: { correct: 0, total: 0 },
          Hard: { correct: 0, total: 0 },
        };
      }

      for (const qa of moduleResult.questionAttempts) {
        const question = questionMap.get(qa.questionId);
        const difficulty: DifficultyLevel = question?.difficulty ?? 'Medium';

        moduleData[moduleName][difficulty].total++;
        overallData[difficulty].total++;

        if (qa.correct) {
          moduleData[moduleName][difficulty].correct++;
          overallData[difficulty].correct++;
        }
      }
    }
  }

  const modules: DifficultyModuleStats[] = Object.entries(moduleData).map(
    ([moduleName, data]) => ({
      moduleName,
      easy: {
        ...data.Easy,
        accuracy: data.Easy.total > 0 ? Math.round((data.Easy.correct / data.Easy.total) * 100) : 0,
      },
      medium: {
        ...data.Medium,
        accuracy: data.Medium.total > 0 ? Math.round((data.Medium.correct / data.Medium.total) * 100) : 0,
      },
      hard: {
        ...data.Hard,
        accuracy: data.Hard.total > 0 ? Math.round((data.Hard.correct / data.Hard.total) * 100) : 0,
      },
    })
  );

  return {
    modules,
    overall: {
      easy: {
        ...overallData.Easy,
        accuracy: overallData.Easy.total > 0
          ? Math.round((overallData.Easy.correct / overallData.Easy.total) * 100)
          : 0,
      },
      medium: {
        ...overallData.Medium,
        accuracy: overallData.Medium.total > 0
          ? Math.round((overallData.Medium.correct / overallData.Medium.total) * 100)
          : 0,
      },
      hard: {
        ...overallData.Hard,
        accuracy: overallData.Hard.total > 0
          ? Math.round((overallData.Hard.correct / overallData.Hard.total) * 100)
          : 0,
      },
    },
  };
}

/**
 * Generate heatmap visualization data from difficulty stats.
 */
export function generateDifficultyHeatmapData(stats: DifficultyStats): HeatmapData {
  const rows = stats.modules.map(m => m.moduleName);
  const columns: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];

  const cells: HeatmapCell[] = [];

  for (const module of stats.modules) {
    cells.push({
      moduleName: module.moduleName,
      difficulty: 'Easy',
      accuracy: module.easy.accuracy,
      total: module.easy.total,
      correct: module.easy.correct,
    });
    cells.push({
      moduleName: module.moduleName,
      difficulty: 'Medium',
      accuracy: module.medium.accuracy,
      total: module.medium.total,
      correct: module.medium.correct,
    });
    cells.push({
      moduleName: module.moduleName,
      difficulty: 'Hard',
      accuracy: module.hard.accuracy,
      total: module.hard.total,
      correct: module.hard.correct,
    });
  }

  return { rows, columns, cells };
}

/**
 * Compute readiness recommendations for each module.
 * Easy > 80% -> recommend trying Medium
 * Medium > 75% -> recommend trying Hard
 * Otherwise, recommend mastering the current level first.
 */
export function computeReadinessRecommendation(
  stats: DifficultyStats
): ReadinessRecommendation[] {
  const recommendations: ReadinessRecommendation[] = [];

  for (const module of stats.modules) {
    // Check if user has mastered all levels
    if (module.hard.total > 0 && module.hard.accuracy >= 75) {
      recommendations.push({
        moduleName: module.moduleName,
        level: 'mastered_all',
        message: `Excellent! You have mastered all difficulty levels in ${module.moduleName}.`,
        currentAccuracy: module.hard.accuracy,
        targetDifficulty: null,
      });
      continue;
    }

    // Check Medium readiness: Medium > 75% -> try Hard
    if (module.medium.total > 0 && module.medium.accuracy > 75) {
      recommendations.push({
        moduleName: module.moduleName,
        level: 'ready_for_hard',
        message: `Ready for Hard in ${module.moduleName}! Your Medium accuracy is ${module.medium.accuracy}%.`,
        currentAccuracy: module.medium.accuracy,
        targetDifficulty: 'Hard',
      });
      continue;
    }

    // Check Easy readiness: Easy > 80% -> try Medium
    if (module.easy.total > 0 && module.easy.accuracy > 80) {
      recommendations.push({
        moduleName: module.moduleName,
        level: 'ready_for_medium',
        message: `Ready for Medium in ${module.moduleName}! Your Easy accuracy is ${module.easy.accuracy}%.`,
        currentAccuracy: module.easy.accuracy,
        targetDifficulty: 'Medium',
      });
      continue;
    }

    // Need to master Easy first
    if (module.easy.total > 0 && module.easy.accuracy <= 80) {
      recommendations.push({
        moduleName: module.moduleName,
        level: 'master_easy',
        message: `Master Easy in ${module.moduleName} before advancing. Current accuracy: ${module.easy.accuracy}%.`,
        currentAccuracy: module.easy.accuracy,
        targetDifficulty: 'Easy',
      });
      continue;
    }

    // Medium needs work
    if (module.medium.total > 0 && module.medium.accuracy <= 75) {
      recommendations.push({
        moduleName: module.moduleName,
        level: 'master_medium',
        message: `Keep practicing Medium in ${module.moduleName}. Current accuracy: ${module.medium.accuracy}%.`,
        currentAccuracy: module.medium.accuracy,
        targetDifficulty: 'Medium',
      });
    }
  }

  return recommendations;
}
