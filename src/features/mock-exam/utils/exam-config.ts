import type { MockExamConfig, SubjectWeighting } from '../types';

/**
 * CFA Level I subject weightings per CFA Institute 2024 curriculum.
 * targetPercent is the midpoint of the range, used for question allocation.
 */
export const CFA_LEVEL1_WEIGHTINGS: SubjectWeighting[] = [
  { subject: 'Ethical and Professional Standards', minPercent: 15, maxPercent: 20, targetPercent: 17.5 },
  { subject: 'Quantitative Methods', minPercent: 6, maxPercent: 9, targetPercent: 7.5 },
  { subject: 'Economics', minPercent: 6, maxPercent: 9, targetPercent: 7.5 },
  { subject: 'Financial Statement Analysis', minPercent: 11, maxPercent: 14, targetPercent: 12.5 },
  { subject: 'Corporate Issuers', minPercent: 6, maxPercent: 9, targetPercent: 7.5 },
  { subject: 'Equity Investments', minPercent: 11, maxPercent: 14, targetPercent: 12.5 },
  { subject: 'Fixed Income', minPercent: 11, maxPercent: 14, targetPercent: 12.5 },
  { subject: 'Derivatives', minPercent: 5, maxPercent: 8, targetPercent: 6.5 },
  { subject: 'Alternative Investments', minPercent: 5, maxPercent: 8, targetPercent: 6.5 },
  { subject: 'Portfolio Management', minPercent: 5, maxPercent: 8, targetPercent: 6.5 },
];

export const PASSING_THRESHOLD = 0.7;
export const EXAM_TOTAL_QUESTIONS = 180;
export const EXAM_TIME_LIMIT_MINUTES = 270;

export const MOCK_EXAM_CONFIG: MockExamConfig = {
  totalQuestions: EXAM_TOTAL_QUESTIONS,
  timeLimitMinutes: EXAM_TIME_LIMIT_MINUTES,
  passingThreshold: PASSING_THRESHOLD,
  subjectWeightings: CFA_LEVEL1_WEIGHTINGS,
};
