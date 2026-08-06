import type { Question } from '@/features/question-bank/types';
import type { SubjectWeighting } from '../types';
import { CFA_LEVEL1_WEIGHTINGS, EXAM_TOTAL_QUESTIONS } from './exam-config';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';
import { alternativeInvestmentsQuestions } from '@/features/question-bank/data/alternative-investments';
import { corporateIssuersQuestions } from '@/features/question-bank/data/corporate-issuers';
import { fsaQuestions } from '@/features/question-bank/data/financial-statement-analysis';
import { portfolioManagementQuestions } from '@/features/question-bank/data/portfolio-management';
import { quantitativeMethodsQuestions } from '@/features/question-bank/data/quantitative-methods';

/**
 * Returns all available questions from the question bank.
 */
export function getAllAvailableQuestions(): Question[] {
  return [
    ...sampleQuestions,
    ...alternativeInvestmentsQuestions,
    ...corporateIssuersQuestions,
    ...fsaQuestions,
    ...portfolioManagementQuestions,
    ...quantitativeMethodsQuestions,
  ];
}

/**
 * Shuffles an array using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculates how many questions each subject should get based on
 * target percentages, normalized to total available questions.
 */
export function calculateSubjectAllocation(
  weightings: SubjectWeighting[],
  totalQuestions: number,
  availableBySubject: Record<string, Question[]>
): Record<string, number> {
  const allocation: Record<string, number> = {};
  let remaining = totalQuestions;

  // First pass: allocate based on target percentages, capped by available and remaining
  const sortedWeightings = [...weightings].sort(
    (a, b) => b.targetPercent - a.targetPercent
  );

  for (const weighting of sortedWeightings) {
    const targetCount = Math.round(
      (weighting.targetPercent / 100) * totalQuestions
    );
    const available = availableBySubject[weighting.subject]?.length ?? 0;
    const count = Math.min(targetCount, available, remaining);
    allocation[weighting.subject] = count;
    remaining -= count;
  }

  // Second pass: distribute remaining slots proportionally among subjects with surplus
  if (remaining > 0) {
    for (const weighting of sortedWeightings) {
      if (remaining <= 0) break;
      const available = availableBySubject[weighting.subject]?.length ?? 0;
      const allocated = allocation[weighting.subject];
      const surplus = available - allocated;
      if (surplus > 0) {
        const extra = Math.min(surplus, remaining);
        allocation[weighting.subject] += extra;
        remaining -= extra;
      }
    }
  }

  return allocation;
}

/**
 * Selects questions for a mock exam following CFA Level I subject weightings.
 * If fewer than 180 questions are available, uses all available questions.
 */
export function selectMockExamQuestions(totalQuestions?: number): Question[] {
  const target = totalQuestions ?? EXAM_TOTAL_QUESTIONS;
  const allQuestions = getAllAvailableQuestions();

  // If fewer total questions than target, use all shuffled
  if (allQuestions.length <= target) {
    return shuffle(allQuestions);
  }

  // Group by subject
  const bySubject: Record<string, Question[]> = {};
  for (const q of allQuestions) {
    const subject = q.subject;
    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push(q);
  }

  // Shuffle each subject pool
  for (const subject of Object.keys(bySubject)) {
    bySubject[subject] = shuffle(bySubject[subject]);
  }

  // Calculate allocation
  const allocation = calculateSubjectAllocation(
    CFA_LEVEL1_WEIGHTINGS,
    target,
    bySubject
  );

  // Select questions from each subject
  const selected: Question[] = [];
  for (const [subject, count] of Object.entries(allocation)) {
    const pool = bySubject[subject] ?? [];
    selected.push(...pool.slice(0, count));
  }

  // Final shuffle to mix subjects
  return shuffle(selected);
}
