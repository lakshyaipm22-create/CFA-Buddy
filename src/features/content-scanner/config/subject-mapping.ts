/**
 * Subject abbreviation → full name mapping.
 * Used for inferring subject from filenames and folder names.
 * Case-insensitive matching is applied at lookup time.
 */
export const subjectMapping: Record<string, string> = {
  // Quantitative Methods
  'qm': 'Quantitative Methods',
  'quants': 'Quantitative Methods',
  'quantitative methods': 'Quantitative Methods',
  'quantitative method': 'Quantitative Methods',

  // Economics
  'eco': 'Economics',
  'economics': 'Economics',
  'econ': 'Economics',

  // Corporate Issuers
  'ci': 'Corporate Issuers',
  'corp issuers': 'Corporate Issuers',
  'corporate issuers': 'Corporate Issuers',
  'corp.issuers': 'Corporate Issuers',
  'corpissuers': 'Corporate Issuers',

  // Financial Statement Analysis
  'fsa': 'Financial Statement Analysis',
  'financial statement analysis': 'Financial Statement Analysis',
  'financial analysis': 'Financial Statement Analysis',

  // Equity Investments
  'equity': 'Equity Investments',
  'equity investments': 'Equity Investments',

  // Fixed Income
  'fi': 'Fixed Income',
  'fixed income': 'Fixed Income',
  'fixedincome': 'Fixed Income',

  // Derivatives
  'deriv': 'Derivatives',
  'derivatives': 'Derivatives',

  // Alternative Investments
  'ai': 'Alternative Investments',
  'alt investments': 'Alternative Investments',
  'alternative investments': 'Alternative Investments',
  'alternative invsts': 'Alternative Investments',
  'alternative': 'Alternative Investments',

  // Portfolio Management
  'pm': 'Portfolio Management',
  'port. mgmt': 'Portfolio Management',
  'port mgmt': 'Portfolio Management',
  'portfolio management': 'Portfolio Management',
  'portofolio management': 'Portfolio Management',

  // Ethical and Professional Standards
  'ethics': 'Ethical and Professional Standards',
  'ethical and professional standards': 'Ethical and Professional Standards',
  'ethical and professional standard': 'Ethical and Professional Standards',
};

/**
 * IFT/UWorld subject folder number → subject name mapping.
 * IFT uses folders like "01 - Quantitative Methods", "02 - Economics"
 * UWorld uses prefixes like "1. Quantitative Methods"
 */
export const subjectNumberMapping: Record<number, string> = {
  1: 'Quantitative Methods',
  2: 'Economics',
  3: 'Corporate Issuers',  // UWorld: "3. Portfolio Management" (Part 1 in Schweser reading order)
  4: 'Corporate Issuers',  // UWorld: "4. Corporate Issuers"
  5: 'Financial Statement Analysis',
  6: 'Equity Investments',
  7: 'Fixed Income',
  8: 'Alternative Investments',
  9: 'Alternative Investments', // UWorld uses 9
  10: 'Ethical and Professional Standards',
};

/**
 * IFT subject folder prefix → subject name.
 * Handles "01 - Quantitative Methods" pattern.
 */
export const iftSubjectFolderMapping: Record<string, string> = {
  '01': 'Quantitative Methods',
  '02': 'Economics',
  '03': 'Corporate Issuers',
  '04': 'Financial Statement Analysis',
  '05': 'Equity Investments',
  '06': 'Fixed Income',
  '07': 'Derivatives',
  '08': 'Alternative Investments',
  '09': 'Portfolio Management',
  '10': 'Ethical and Professional Standards',
};

/**
 * Resolve subject from an abbreviation or name (case-insensitive).
 * Returns null if no match found.
 */
export function resolveSubject(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  return subjectMapping[normalized] ?? null;
}

/**
 * Try to extract subject from a filename or path segment.
 * Uses multiple strategies: direct match, abbreviation, number prefix.
 */
export function inferSubject(input: string): string | null {
  // Try direct match first
  const direct = resolveSubject(input);
  if (direct) return direct;

  // Try matching against known full names (case-insensitive substring)
  const subjects = [...new Set(Object.values(subjectMapping))];
  const lowerInput = input.toLowerCase();
  for (const subject of subjects) {
    if (lowerInput.includes(subject.toLowerCase())) {
      return subject;
    }
  }

  // Try abbreviation patterns in the input
  for (const [abbr, name] of Object.entries(subjectMapping)) {
    // Match whole word boundaries
    const regex = new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(input)) {
      return name;
    }
  }

  return null;
}
