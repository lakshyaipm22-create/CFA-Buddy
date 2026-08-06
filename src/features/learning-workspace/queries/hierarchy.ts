/**
 * Hierarchy Query - fetches Level -> Subject -> Reading -> Topic structure
 *
 * Uses the seed data structure when no database is available.
 * Falls back to content-index.json-based data when seed data matches are absent.
 */

export interface TopicInfo {
  id: string;
  name: string;
  losCode: string;
  sortOrder: number;
}

export interface ReadingHierarchyInfo {
  id: string;
  name: string;
  readingNumber: number;
  topics: TopicInfo[];
}

export interface SubjectHierarchyInfo {
  id: string;
  name: string;
  abbreviation: string;
  weight: number;
  sortOrder: number;
  readings: ReadingHierarchyInfo[];
}

export interface LevelHierarchyInfo {
  id: string;
  name: string;
  subjects: SubjectHierarchyInfo[];
}

/**
 * Full CFA Level I curriculum hierarchy data (matching prisma/seed.ts structure).
 * Used as a local fallback when no database is connected.
 */
const LEVEL_I_HIERARCHY: LevelHierarchyInfo = {
  id: 'level-1',
  name: 'I',
  subjects: [
    {
      id: 'subj-qm',
      name: 'Quantitative Methods',
      abbreviation: 'QM',
      weight: 0.075,
      sortOrder: 1,
      readings: [
        {
          id: 'read-qm-1',
          name: 'Time Value of Money',
          readingNumber: 1,
          topics: [
            { id: 'topic-qm-1-a', name: 'Interest Rates and Present Value', losCode: 'QM-1-a', sortOrder: 1 },
            { id: 'topic-qm-1-b', name: 'Future Value and Compounding', losCode: 'QM-1-b', sortOrder: 2 },
            { id: 'topic-qm-1-c', name: 'Annuities, Perpetuities, and Uneven Cash Flows', losCode: 'QM-1-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-qm-2',
          name: 'Statistical Concepts and Market Returns',
          readingNumber: 2,
          topics: [
            { id: 'topic-qm-2-a', name: 'Descriptive Statistics', losCode: 'QM-2-a', sortOrder: 1 },
            { id: 'topic-qm-2-b', name: 'Probability Distributions', losCode: 'QM-2-b', sortOrder: 2 },
            { id: 'topic-qm-2-c', name: 'Sampling and Estimation', losCode: 'QM-2-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-qm-3',
          name: 'Hypothesis Testing and Linear Regression',
          readingNumber: 3,
          topics: [
            { id: 'topic-qm-3-a', name: 'Hypothesis Testing', losCode: 'QM-3-a', sortOrder: 1 },
            { id: 'topic-qm-3-b', name: 'Simple Linear Regression', losCode: 'QM-3-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-eco',
      name: 'Economics',
      abbreviation: 'Eco',
      weight: 0.075,
      sortOrder: 2,
      readings: [
        {
          id: 'read-eco-1',
          name: 'Demand and Supply Analysis',
          readingNumber: 1,
          topics: [
            { id: 'topic-eco-1-a', name: 'Demand and Supply Curves', losCode: 'Eco-1-a', sortOrder: 1 },
            { id: 'topic-eco-1-b', name: 'Consumer and Producer Surplus', losCode: 'Eco-1-b', sortOrder: 2 },
            { id: 'topic-eco-1-c', name: 'Market Equilibrium', losCode: 'Eco-1-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-eco-2',
          name: 'Aggregate Output, Prices, and Economic Growth',
          readingNumber: 2,
          topics: [
            { id: 'topic-eco-2-a', name: 'GDP and Economic Indicators', losCode: 'Eco-2-a', sortOrder: 1 },
            { id: 'topic-eco-2-b', name: 'Business Cycles', losCode: 'Eco-2-b', sortOrder: 2 },
          ],
        },
        {
          id: 'read-eco-3',
          name: 'Monetary and Fiscal Policy',
          readingNumber: 3,
          topics: [
            { id: 'topic-eco-3-a', name: 'Central Banks and Monetary Policy', losCode: 'Eco-3-a', sortOrder: 1 },
            { id: 'topic-eco-3-b', name: 'Fiscal Policy Tools', losCode: 'Eco-3-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-ci',
      name: 'Corporate Issuers',
      abbreviation: 'CI',
      weight: 0.075,
      sortOrder: 3,
      readings: [
        {
          id: 'read-ci-1',
          name: 'Corporate Governance and ESG',
          readingNumber: 1,
          topics: [
            { id: 'topic-ci-1-a', name: 'Corporate Governance Mechanisms', losCode: 'CI-1-a', sortOrder: 1 },
            { id: 'topic-ci-1-b', name: 'Stakeholder Management', losCode: 'CI-1-b', sortOrder: 2 },
          ],
        },
        {
          id: 'read-ci-2',
          name: 'Capital Structure and Leverage',
          readingNumber: 2,
          topics: [
            { id: 'topic-ci-2-a', name: 'Modigliani-Miller Propositions', losCode: 'CI-2-a', sortOrder: 1 },
            { id: 'topic-ci-2-b', name: 'Optimal Capital Structure', losCode: 'CI-2-b', sortOrder: 2 },
            { id: 'topic-ci-2-c', name: 'Leverage and Risk', losCode: 'CI-2-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-ci-3',
          name: 'Capital Budgeting',
          readingNumber: 3,
          topics: [
            { id: 'topic-ci-3-a', name: 'NPV and IRR', losCode: 'CI-3-a', sortOrder: 1 },
            { id: 'topic-ci-3-b', name: 'Project Analysis and Evaluation', losCode: 'CI-3-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-fsa',
      name: 'Financial Statement Analysis',
      abbreviation: 'FSA',
      weight: 0.125,
      sortOrder: 4,
      readings: [
        {
          id: 'read-fsa-1',
          name: 'Financial Reporting Standards',
          readingNumber: 1,
          topics: [
            { id: 'topic-fsa-1-a', name: 'IFRS and US GAAP Framework', losCode: 'FSA-1-a', sortOrder: 1 },
            { id: 'topic-fsa-1-b', name: 'Financial Reporting Quality', losCode: 'FSA-1-b', sortOrder: 2 },
          ],
        },
        {
          id: 'read-fsa-2',
          name: 'Income Statements and Balance Sheets',
          readingNumber: 2,
          topics: [
            { id: 'topic-fsa-2-a', name: 'Revenue Recognition', losCode: 'FSA-2-a', sortOrder: 1 },
            { id: 'topic-fsa-2-b', name: 'Balance Sheet Components', losCode: 'FSA-2-b', sortOrder: 2 },
            { id: 'topic-fsa-2-c', name: 'Financial Ratios', losCode: 'FSA-2-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-fsa-3',
          name: 'Cash Flow Statements',
          readingNumber: 3,
          topics: [
            { id: 'topic-fsa-3-a', name: 'Operating Cash Flows', losCode: 'FSA-3-a', sortOrder: 1 },
            { id: 'topic-fsa-3-b', name: 'Free Cash Flow Analysis', losCode: 'FSA-3-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-equity',
      name: 'Equity Investments',
      abbreviation: 'Equity',
      weight: 0.125,
      sortOrder: 5,
      readings: [
        {
          id: 'read-equity-1',
          name: 'Market Organization and Structure',
          readingNumber: 1,
          topics: [
            { id: 'topic-equity-1-a', name: 'Market Types and Trading', losCode: 'Equity-1-a', sortOrder: 1 },
            { id: 'topic-equity-1-b', name: 'Security Market Indexes', losCode: 'Equity-1-b', sortOrder: 2 },
          ],
        },
        {
          id: 'read-equity-2',
          name: 'Equity Valuation: Concepts and Tools',
          readingNumber: 2,
          topics: [
            { id: 'topic-equity-2-a', name: 'Dividend Discount Models', losCode: 'Equity-2-a', sortOrder: 1 },
            { id: 'topic-equity-2-b', name: 'Price Multiples', losCode: 'Equity-2-b', sortOrder: 2 },
            { id: 'topic-equity-2-c', name: 'Enterprise Value', losCode: 'Equity-2-c', sortOrder: 3 },
          ],
        },
      ],
    },
    {
      id: 'subj-fi',
      name: 'Fixed Income',
      abbreviation: 'FI',
      weight: 0.125,
      sortOrder: 6,
      readings: [
        {
          id: 'read-fi-1',
          name: 'Fixed-Income Securities: Defining Elements',
          readingNumber: 1,
          topics: [
            { id: 'topic-fi-1-a', name: 'Bond Features and Types', losCode: 'FI-1-a', sortOrder: 1 },
            { id: 'topic-fi-1-b', name: 'Bond Indentures and Covenants', losCode: 'FI-1-b', sortOrder: 2 },
          ],
        },
        {
          id: 'read-fi-2',
          name: 'Fixed-Income Valuation',
          readingNumber: 2,
          topics: [
            { id: 'topic-fi-2-a', name: 'Bond Pricing and YTM', losCode: 'FI-2-a', sortOrder: 1 },
            { id: 'topic-fi-2-b', name: 'Spot Rates and Forward Rates', losCode: 'FI-2-b', sortOrder: 2 },
            { id: 'topic-fi-2-c', name: 'Yield Spread Analysis', losCode: 'FI-2-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-fi-3',
          name: 'Fixed-Income Risk and Return',
          readingNumber: 3,
          topics: [
            { id: 'topic-fi-3-a', name: 'Duration and Convexity', losCode: 'FI-3-a', sortOrder: 1 },
            { id: 'topic-fi-3-b', name: 'Interest Rate Risk', losCode: 'FI-3-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-deriv',
      name: 'Derivatives',
      abbreviation: 'Deriv',
      weight: 0.065,
      sortOrder: 7,
      readings: [
        {
          id: 'read-deriv-1',
          name: 'Derivative Markets and Instruments',
          readingNumber: 1,
          topics: [
            { id: 'topic-deriv-1-a', name: 'Forward and Futures Contracts', losCode: 'Deriv-1-a', sortOrder: 1 },
            { id: 'topic-deriv-1-b', name: 'Options Contracts', losCode: 'Deriv-1-b', sortOrder: 2 },
            { id: 'topic-deriv-1-c', name: 'Swap Contracts', losCode: 'Deriv-1-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-deriv-2',
          name: 'Pricing and Valuation of Derivatives',
          readingNumber: 2,
          topics: [
            { id: 'topic-deriv-2-a', name: 'No-Arbitrage Pricing', losCode: 'Deriv-2-a', sortOrder: 1 },
            { id: 'topic-deriv-2-b', name: 'Put-Call Parity', losCode: 'Deriv-2-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-ai',
      name: 'Alternative Investments',
      abbreviation: 'AI',
      weight: 0.065,
      sortOrder: 8,
      readings: [
        {
          id: 'read-ai-1',
          name: 'Alternative Investment Features',
          readingNumber: 1,
          topics: [
            { id: 'topic-ai-1-a', name: 'Private Equity and Venture Capital', losCode: 'AI-1-a', sortOrder: 1 },
            { id: 'topic-ai-1-b', name: 'Real Estate Investment', losCode: 'AI-1-b', sortOrder: 2 },
            { id: 'topic-ai-1-c', name: 'Hedge Fund Strategies', losCode: 'AI-1-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-ai-2',
          name: 'Risk Management and Diversification',
          readingNumber: 2,
          topics: [
            { id: 'topic-ai-2-a', name: 'Risk-Return Profile of Alternatives', losCode: 'AI-2-a', sortOrder: 1 },
            { id: 'topic-ai-2-b', name: 'Due Diligence', losCode: 'AI-2-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-pm',
      name: 'Portfolio Management',
      abbreviation: 'PM',
      weight: 0.10,
      sortOrder: 9,
      readings: [
        {
          id: 'read-pm-1',
          name: 'Portfolio Risk and Return',
          readingNumber: 1,
          topics: [
            { id: 'topic-pm-1-a', name: 'Modern Portfolio Theory', losCode: 'PM-1-a', sortOrder: 1 },
            { id: 'topic-pm-1-b', name: 'Capital Asset Pricing Model', losCode: 'PM-1-b', sortOrder: 2 },
            { id: 'topic-pm-1-c', name: 'Efficient Frontier', losCode: 'PM-1-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-pm-2',
          name: 'Portfolio Planning and Construction',
          readingNumber: 2,
          topics: [
            { id: 'topic-pm-2-a', name: 'Investment Policy Statement', losCode: 'PM-2-a', sortOrder: 1 },
            { id: 'topic-pm-2-b', name: 'Asset Allocation', losCode: 'PM-2-b', sortOrder: 2 },
          ],
        },
      ],
    },
    {
      id: 'subj-ethics',
      name: 'Ethical and Professional Standards',
      abbreviation: 'Ethics',
      weight: 0.175,
      sortOrder: 10,
      readings: [
        {
          id: 'read-ethics-1',
          name: 'Code of Ethics and Standards of Professional Conduct',
          readingNumber: 1,
          topics: [
            { id: 'topic-ethics-1-a', name: 'Professionalism Standards', losCode: 'Ethics-1-a', sortOrder: 1 },
            { id: 'topic-ethics-1-b', name: 'Integrity of Capital Markets', losCode: 'Ethics-1-b', sortOrder: 2 },
            { id: 'topic-ethics-1-c', name: 'Duties to Clients', losCode: 'Ethics-1-c', sortOrder: 3 },
          ],
        },
        {
          id: 'read-ethics-2',
          name: 'Global Investment Performance Standards (GIPS)',
          readingNumber: 2,
          topics: [
            { id: 'topic-ethics-2-a', name: 'GIPS Fundamentals', losCode: 'Ethics-2-a', sortOrder: 1 },
            { id: 'topic-ethics-2-b', name: 'Compliance and Verification', losCode: 'Ethics-2-b', sortOrder: 2 },
          ],
        },
        {
          id: 'read-ethics-3',
          name: 'Ethical Decision-Making Framework',
          readingNumber: 3,
          topics: [
            { id: 'topic-ethics-3-a', name: 'Ethical Decision-Making Process', losCode: 'Ethics-3-a', sortOrder: 1 },
            { id: 'topic-ethics-3-b', name: 'Case Studies in Ethics', losCode: 'Ethics-3-b', sortOrder: 2 },
          ],
        },
      ],
    },
  ],
};

/**
 * Get the full curriculum hierarchy for a given level.
 * Returns the hardcoded seed data structure (matching what the DB would provide).
 */
export function getCurriculumHierarchy(level: number = 1): LevelHierarchyInfo {
  if (level === 1) return LEVEL_I_HIERARCHY;
  // Level II and III would be added when content is available
  return {
    id: `level-${level}`,
    name: level === 2 ? 'II' : 'III',
    subjects: [],
  };
}

/**
 * Get a specific subject with its readings and topics.
 */
export function getSubjectHierarchy(subjectName: string, level: number = 1): SubjectHierarchyInfo | null {
  const hierarchy = getCurriculumHierarchy(level);
  return hierarchy.subjects.find(s => s.name === subjectName) ?? null;
}

/**
 * Get a specific reading with its topics.
 */
export function getReadingHierarchy(subjectName: string, readingName: string, level: number = 1): ReadingHierarchyInfo | null {
  const subject = getSubjectHierarchy(subjectName, level);
  if (!subject) return null;
  return subject.readings.find(r => r.name === readingName) ?? null;
}

/**
 * Get all topics for a given reading.
 */
export function getTopicsForReading(subjectName: string, readingName: string, level: number = 1): TopicInfo[] {
  const reading = getReadingHierarchy(subjectName, readingName, level);
  return reading?.topics ?? [];
}
