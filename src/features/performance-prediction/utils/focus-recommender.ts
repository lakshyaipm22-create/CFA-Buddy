/**
 * Focus Recommender.
 * Identifies the top-5 areas for maximum score improvement per study hour.
 * Considers curriculum weights, current weakness, and available question count.
 */

import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import { CFA_SUBJECTS_ORDERED, CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import type { FocusRecommendation } from '../types';

/** Maximum number of recommendations to return */
const MAX_RECOMMENDATIONS = 5;

/** Minimum Passing Score estimate */
const ESTIMATED_MPS = 70;

interface SubjectAnalysis {
  subject: string;
  accuracy: number;
  questionsAttempted: number;
  questionsAvailable: number;
  curriculumWeight: number;
  topicBreakdown: Map<string, { correct: number; total: number }>;
}

/**
 * Compute focus recommendations based on practice history.
 * Returns up to 5 areas ranked by expected score improvement per study hour.
 */
export function computeFocusRecommendations(
  attempts: PracticeAttempt[],
  questionCountBySubject: Record<string, number>
): FocusRecommendation[] {
  if (attempts.length === 0) {
    return getDefaultRecommendations(questionCountBySubject);
  }

  const subjectAnalyses = analyzeSubjects(attempts, questionCountBySubject);
  const candidates = generateCandidates(subjectAnalyses);

  // Sort by expected impact descending
  candidates.sort((a, b) => b.expectedImpact - a.expectedImpact);

  // Take top recommendations and assign priorities
  return candidates.slice(0, MAX_RECOMMENDATIONS).map((rec, idx) => ({
    ...rec,
    priority: idx + 1,
  }));
}

/**
 * Analyze per-subject performance from attempts.
 */
function analyzeSubjects(
  attempts: PracticeAttempt[],
  questionCountBySubject: Record<string, number>
): SubjectAnalysis[] {
  const subjectMap = new Map<
    string,
    {
      correct: number;
      total: number;
      questionIds: Set<string>;
      topicBreakdown: Map<string, { correct: number; total: number }>;
    }
  >();

  for (const attempt of attempts) {
    if (!subjectMap.has(attempt.subjectName)) {
      subjectMap.set(attempt.subjectName, {
        correct: 0,
        total: 0,
        questionIds: new Set(),
        topicBreakdown: new Map(),
      });
    }
    const entry = subjectMap.get(attempt.subjectName)!;
    entry.correct += attempt.overallScore;
    entry.total += attempt.overallTotal;

    for (const mr of attempt.moduleResults) {
      for (const qa of mr.questionAttempts) {
        entry.questionIds.add(qa.questionId);

        // Topic-level tracking using module name as topic proxy
        const topic = mr.moduleName;
        if (!entry.topicBreakdown.has(topic)) {
          entry.topicBreakdown.set(topic, { correct: 0, total: 0 });
        }
        const topicEntry = entry.topicBreakdown.get(topic)!;
        topicEntry.total++;
        if (qa.correct) topicEntry.correct++;
      }
    }
  }

  return CFA_SUBJECTS_ORDERED.map(subject => {
    const entry = subjectMap.get(subject);
    const available = questionCountBySubject[subject] ?? 0;
    const weight = CFA_CURRICULUM_WEIGHTS[subject] ?? 0;

    if (!entry || entry.total === 0) {
      return {
        subject,
        accuracy: 0,
        questionsAttempted: 0,
        questionsAvailable: available,
        curriculumWeight: weight,
        topicBreakdown: new Map(),
      };
    }

    return {
      subject,
      accuracy: Math.round((entry.correct / entry.total) * 100),
      questionsAttempted: entry.questionIds.size,
      questionsAvailable: available,
      curriculumWeight: weight,
      topicBreakdown: entry.topicBreakdown,
    };
  });
}

/**
 * Generate candidate recommendations with expected impact scoring.
 * Impact formula: curriculum_weight * gap_from_MPS * opportunity_factor
 */
function generateCandidates(analyses: SubjectAnalysis[]): FocusRecommendation[] {
  const candidates: FocusRecommendation[] = [];

  for (const analysis of analyses) {
    // Subject-level recommendation
    const gap = Math.max(0, ESTIMATED_MPS - analysis.accuracy);
    const opportunityFactor = computeOpportunityFactor(analysis);

    if (gap > 0 || analysis.questionsAttempted === 0) {
      const expectedImpact = computeExpectedImpact(analysis, gap, opportunityFactor);

      candidates.push({
        subject: analysis.subject,
        topic: null,
        priority: 0, // Will be assigned after sorting
        expectedImpact: Math.round(expectedImpact * 10) / 10,
        reason: generateReason(analysis, gap),
        currentAccuracy: analysis.accuracy,
        curriculumWeight: analysis.curriculumWeight,
      });
    }

    // Topic-level recommendations for subjects with data
    if (analysis.topicBreakdown.size > 0) {
      for (const [topic, stats] of analysis.topicBreakdown) {
        if (stats.total < 3) continue; // Need minimum data

        const topicAccuracy = Math.round((stats.correct / stats.total) * 100);
        const topicGap = Math.max(0, ESTIMATED_MPS - topicAccuracy);

        if (topicGap > 15) {
          // Only recommend topics significantly below MPS
          const topicImpact =
            analysis.curriculumWeight * (topicGap / 100) * 0.8;

          candidates.push({
            subject: analysis.subject,
            topic,
            priority: 0,
            expectedImpact: Math.round(topicImpact * 100) / 10,
            reason: `${topic} in ${analysis.subject} is at ${topicAccuracy}%, well below passing threshold`,
            currentAccuracy: topicAccuracy,
            curriculumWeight: analysis.curriculumWeight,
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * Compute opportunity factor: how much room for improvement exists.
 * Higher when: low coverage (more questions to practice), high curriculum weight.
 */
function computeOpportunityFactor(analysis: SubjectAnalysis): number {
  const coverageRatio =
    analysis.questionsAvailable > 0
      ? analysis.questionsAttempted / analysis.questionsAvailable
      : 1;

  // More unvisited questions = more opportunity
  const unexploredBonus = 1 - coverageRatio;

  // Base opportunity from curriculum weight
  return (1 + unexploredBonus) * (analysis.curriculumWeight / 0.15);
}

/**
 * Compute expected score improvement per study hour.
 * Higher weight subjects with larger gaps yield higher expected impact.
 */
function computeExpectedImpact(
  analysis: SubjectAnalysis,
  gap: number,
  opportunityFactor: number
): number {
  // Base impact: curriculum weight determines how much each % improvement matters
  const weightMultiplier = analysis.curriculumWeight * 100;

  // Gap provides the raw improvement potential (diminishing returns above 30%)
  const gapFactor = Math.min(gap, 30) / 30;

  // Untouched subjects get a bonus (high ROI for first exposure)
  const newSubjectBonus = analysis.questionsAttempted === 0 ? 1.5 : 1.0;

  return weightMultiplier * gapFactor * opportunityFactor * newSubjectBonus;
}

/**
 * Generate human-readable reason for recommendation.
 */
function generateReason(analysis: SubjectAnalysis, gap: number): string {
  if (analysis.questionsAttempted === 0) {
    return `${analysis.subject} (${Math.round(analysis.curriculumWeight * 100)}% of exam) has not been practiced yet`;
  }

  if (gap > 20) {
    return `${analysis.subject} is ${gap}% below passing threshold with ${Math.round(analysis.curriculumWeight * 100)}% exam weight`;
  }

  if (gap > 0) {
    return `${analysis.subject} is close to passing but needs ${gap}% more to reach MPS`;
  }

  return `${analysis.subject} has adequate accuracy but limited coverage`;
}

/**
 * Default recommendations when no attempts exist.
 * Prioritizes highest-weight subjects.
 */
function getDefaultRecommendations(
  questionCountBySubject: Record<string, number>
): FocusRecommendation[] {
  const sorted = [...CFA_SUBJECTS_ORDERED]
    .map(subject => ({
      subject,
      weight: CFA_CURRICULUM_WEIGHTS[subject] ?? 0,
      available: questionCountBySubject[subject] ?? 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  return sorted.slice(0, MAX_RECOMMENDATIONS).map((item, idx) => ({
    subject: item.subject,
    topic: null,
    priority: idx + 1,
    expectedImpact: Math.round(item.weight * 100 * 10) / 10,
    reason: `${item.subject} accounts for ${Math.round(item.weight * 100)}% of the exam; start here for maximum impact`,
    currentAccuracy: 0,
    curriculumWeight: item.weight,
  }));
}
