import type { PracticeAttempt, ModuleResult } from '@/features/question-bank/types/attempt';
import { CFA_SUBJECTS_ORDERED, CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import { getQuestionCountBySubject } from '@/features/question-bank/utils/question-loader';

export interface WeakModule {
  name: string;
  score: number;
  total: number;
  percentage: number;
}

export interface StrongModule {
  name: string;
  percentage: number;
}

export interface SubjectReadiness {
  subject: string;
  accuracy: number;
  coverage: number;
  questionsAttempted: number;
  questionsAvailable: number;
  avgTimePerQuestion: number;
  weakModules: WeakModule[];
  strongModules: StrongModule[];
  examWeight: number;
}

export interface ReadinessResult {
  overallScore: number;
  subjects: SubjectReadiness[];
  passEstimate: number;
  gapFromMPS: number;
}

/**
 * Minimum Passing Score estimate (CFA Institute does not publish the exact number;
 * 70% is the widely accepted approximation).
 */
const ESTIMATED_MPS = 70;

/**
 * Compute a comprehensive readiness analysis from practice attempt data.
 * Uses CFA curriculum weights to produce a weighted overall score and
 * per-subject breakdowns including module-level weak/strong identification.
 */
export function computeReadiness(attempts: PracticeAttempt[]): ReadinessResult {
  if (attempts.length === 0) {
    return {
      overallScore: 0,
      subjects: [],
      passEstimate: 0,
      gapFromMPS: ESTIMATED_MPS,
    };
  }

  const questionCounts = getQuestionCountBySubject();

  // Aggregate per-subject data across all attempts
  const subjectMap = new Map<
    string,
    {
      totalCorrect: number;
      totalQuestions: number;
      totalTime: number;
      moduleResults: ModuleResult[];
      attemptedQuestionIds: Set<string>;
    }
  >();

  for (const attempt of attempts) {
    const subject = attempt.subjectName;
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        totalCorrect: 0,
        totalQuestions: 0,
        totalTime: 0,
        moduleResults: [],
        attemptedQuestionIds: new Set(),
      });
    }
    const entry = subjectMap.get(subject)!;
    entry.totalCorrect += attempt.overallScore;
    entry.totalQuestions += attempt.overallTotal;
    entry.totalTime += attempt.avgTimePerQuestion * attempt.overallTotal;

    for (const mr of attempt.moduleResults) {
      entry.moduleResults.push(mr);
      for (const qa of mr.questionAttempts) {
        entry.attemptedQuestionIds.add(qa.questionId);
      }
    }
  }

  // Build per-subject readiness
  const subjects: SubjectReadiness[] = [];

  for (const subjectName of CFA_SUBJECTS_ORDERED) {
    const entry = subjectMap.get(subjectName);
    const available = questionCounts[subjectName] ?? 0;
    const weight = CFA_CURRICULUM_WEIGHTS[subjectName] ?? 0;

    if (!entry || entry.totalQuestions === 0) {
      subjects.push({
        subject: subjectName,
        accuracy: 0,
        coverage: 0,
        questionsAttempted: 0,
        questionsAvailable: available,
        avgTimePerQuestion: 0,
        weakModules: [],
        strongModules: [],
        examWeight: weight,
      });
      continue;
    }

    const accuracy = Math.round((entry.totalCorrect / entry.totalQuestions) * 100);
    const uniqueAttempted = entry.attemptedQuestionIds.size;
    const coverage = available > 0 ? Math.round((uniqueAttempted / available) * 100) : 0;
    const avgTime = entry.totalQuestions > 0 ? Math.round(entry.totalTime / entry.totalQuestions) : 0;

    // Aggregate module-level stats (combine across attempts)
    const moduleMap = new Map<string, { name: string; score: number; total: number }>();
    for (const mr of entry.moduleResults) {
      const existing = moduleMap.get(mr.moduleId);
      if (existing) {
        existing.score += mr.score;
        existing.total += mr.total;
      } else {
        moduleMap.set(mr.moduleId, { name: mr.moduleName, score: mr.score, total: mr.total });
      }
    }

    const modulesWithPercentage = Array.from(moduleMap.values())
      .filter(m => m.total > 0)
      .map(m => ({
        name: m.name,
        score: m.score,
        total: m.total,
        percentage: Math.round((m.score / m.total) * 100),
      }));

    // Sort by percentage ascending to find weakest
    const sortedAsc = [...modulesWithPercentage].sort((a, b) => a.percentage - b.percentage);
    const weakModules: WeakModule[] = sortedAsc.slice(0, 3).map(m => ({
      name: m.name,
      score: m.score,
      total: m.total,
      percentage: m.percentage,
    }));

    // Sort by percentage descending to find strongest
    const sortedDesc = [...modulesWithPercentage].sort((a, b) => b.percentage - a.percentage);
    const strongModules: StrongModule[] = sortedDesc.slice(0, 2).map(m => ({
      name: m.name,
      percentage: m.percentage,
    }));

    subjects.push({
      subject: subjectName,
      accuracy,
      coverage,
      questionsAttempted: uniqueAttempted,
      questionsAvailable: available,
      avgTimePerQuestion: avgTime,
      weakModules,
      strongModules,
      examWeight: weight,
    });
  }

  // Compute weighted overall score
  let weightedSum = 0;
  let totalWeight = 0;

  for (const sr of subjects) {
    if (sr.questionsAttempted > 0) {
      const weight = CFA_CURRICULUM_WEIGHTS[sr.subject] ?? 0;
      weightedSum += sr.accuracy * weight;
      totalWeight += weight;
    }
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Estimate pass probability
  const passEstimate = estimatePassProbability(overallScore);

  // Gap from MPS
  const gapFromMPS = Math.max(0, ESTIMATED_MPS - overallScore);

  return { overallScore, subjects, passEstimate, gapFromMPS };
}

/**
 * Rough pass probability based on weighted overall score.
 * Not statistically rigorous - provides directional guidance.
 */
function estimatePassProbability(overallScore: number): number {
  if (overallScore >= 80) return 95;
  if (overallScore >= 75) return 85;
  if (overallScore >= 72) return 80;
  if (overallScore >= 70) return 70;
  if (overallScore >= 65) return 55;
  if (overallScore >= 60) return 40;
  if (overallScore >= 55) return 25;
  if (overallScore >= 50) return 15;
  return 5;
}
