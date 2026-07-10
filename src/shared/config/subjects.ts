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
