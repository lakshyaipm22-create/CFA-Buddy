/**
 * CFA Level I subjects in official curriculum order.
 * This is the canonical order used throughout the app.
 */
export const CFA_SUBJECTS_ORDERED = [
  'Quantitative Methods',
  'Economics',
  'Corporate Issuers',
  'Financial Statement Analysis',
  'Equity Investments',
  'Fixed Income',
  'Derivatives',
  'Alternative Investments',
  'Portfolio Management',
  'Ethical and Professional Standards',
] as const;

export type CfaSubject = (typeof CFA_SUBJECTS_ORDERED)[number];

/**
 * Official CFA Level I curriculum weights (approximate percentages as decimals).
 * Single source of truth used by readiness score, weekly report, and focus suggestions.
 */
export const CFA_CURRICULUM_WEIGHTS: Record<string, number> = {
  'Ethical and Professional Standards': 0.15,
  'Quantitative Methods': 0.08,
  'Economics': 0.08,
  'Financial Statement Analysis': 0.13,
  'Corporate Issuers': 0.08,
  'Equity Investments': 0.13,
  'Fixed Income': 0.13,
  'Derivatives': 0.06,
  'Alternative Investments': 0.06,
  'Portfolio Management': 0.10,
};

/**
 * Sort an array of subject names by CFA curriculum order.
 * Unknown subjects go at the end.
 */
export function sortByCfaOrder(subjects: string[]): string[] {
  return [...subjects].sort((a, b) => {
    const idxA = CFA_SUBJECTS_ORDERED.indexOf(a as CfaSubject);
    const idxB = CFA_SUBJECTS_ORDERED.indexOf(b as CfaSubject);
    const orderA = idxA >= 0 ? idxA : 999;
    const orderB = idxB >= 0 ? idxB : 999;
    return orderA - orderB;
  });
}
