/**
 * CFA Level I Concept Dependency Graph.
 * Defines 50+ key concepts across all 10 subjects with prerequisite relationships.
 * This graph powers the knowledge visualization, prerequisite alerts, and study path.
 */

import type { ConceptNode, ConceptEdge, KnowledgeGraphData } from '../types';

export const CONCEPT_NODES: ConceptNode[] = [
  // === Quantitative Methods (8 nodes) ===
  {
    id: 'tvm',
    name: 'Time Value of Money',
    subject: 'Quantitative Methods',
    topic: 'Rates and Returns',
    prerequisites: [],
    description: 'Foundation of finance: present value, future value, discount factors, and compounding.',
  },
  {
    id: 'basic-statistics',
    name: 'Basic Statistics',
    subject: 'Quantitative Methods',
    topic: 'Organizing, Visualizing, and Describing Data',
    prerequisites: [],
    description: 'Descriptive statistics, measures of central tendency, dispersion, and data distributions.',
  },
  {
    id: 'probability',
    name: 'Probability Concepts',
    subject: 'Quantitative Methods',
    topic: 'Probability Concepts',
    prerequisites: ['basic-statistics'],
    description: 'Conditional probability, Bayes theorem, expected values, and probability rules.',
  },
  {
    id: 'distributions',
    name: 'Probability Distributions',
    subject: 'Quantitative Methods',
    topic: 'Common Probability Distributions',
    prerequisites: ['probability'],
    description: 'Normal, binomial, lognormal distributions and their properties.',
  },
  {
    id: 'sampling',
    name: 'Sampling and Estimation',
    subject: 'Quantitative Methods',
    topic: 'Sampling and Estimation',
    prerequisites: ['distributions'],
    description: 'Sampling methods, central limit theorem, confidence intervals.',
  },
  {
    id: 'hypothesis-testing',
    name: 'Hypothesis Testing',
    subject: 'Quantitative Methods',
    topic: 'Hypothesis Testing',
    prerequisites: ['sampling'],
    description: 'Null/alternative hypotheses, test statistics, p-values, Type I/II errors.',
  },
  {
    id: 'regression',
    name: 'Linear Regression',
    subject: 'Quantitative Methods',
    topic: 'Introduction to Linear Regression',
    prerequisites: ['basic-statistics', 'hypothesis-testing'],
    description: 'Simple and multiple regression, R-squared, significance of coefficients.',
  },
  {
    id: 'time-series',
    name: 'Time-Series Analysis',
    subject: 'Quantitative Methods',
    topic: 'Introduction to Linear Regression',
    prerequisites: ['regression'],
    description: 'Trend models, autoregressive processes, and forecasting techniques.',
  },

  // === Economics (6 nodes) ===
  {
    id: 'demand-supply',
    name: 'Demand and Supply',
    subject: 'Economics',
    topic: 'Topics in Demand and Supply Analysis',
    prerequisites: [],
    description: 'Market equilibrium, shifts in curves, and price determination.',
  },
  {
    id: 'elasticity',
    name: 'Elasticity',
    subject: 'Economics',
    topic: 'Topics in Demand and Supply Analysis',
    prerequisites: ['demand-supply'],
    description: 'Price, income, and cross-elasticity of demand; factors affecting elasticity.',
  },
  {
    id: 'market-structures',
    name: 'Market Structures',
    subject: 'Economics',
    topic: 'The Firm and Market Structures',
    prerequisites: ['elasticity'],
    description: 'Perfect competition, monopoly, monopolistic competition, and oligopoly.',
  },
  {
    id: 'gdp-business-cycle',
    name: 'GDP and Business Cycles',
    subject: 'Economics',
    topic: 'Introduction to Business Cycles',
    prerequisites: ['demand-supply'],
    description: 'GDP measurement, aggregate demand/supply, and economic cycle phases.',
  },
  {
    id: 'monetary-policy',
    name: 'Monetary and Fiscal Policy',
    subject: 'Economics',
    topic: 'Monetary and Fiscal Policy',
    prerequisites: ['gdp-business-cycle'],
    description: 'Central bank tools, interest rate targets, fiscal spending and taxation effects.',
  },
  {
    id: 'international-trade',
    name: 'International Trade and Capital Flows',
    subject: 'Economics',
    topic: 'International Trade and Capital Flows',
    prerequisites: ['demand-supply', 'monetary-policy'],
    description: 'Comparative advantage, balance of payments, exchange rate determination.',
  },

  // === Corporate Issuers (5 nodes) ===
  {
    id: 'wacc',
    name: 'Weighted Average Cost of Capital',
    subject: 'Corporate Issuers',
    topic: 'Cost of Capital',
    prerequisites: ['tvm'],
    description: 'Computing cost of equity (CAPM, DDM), cost of debt, and weighted average.',
  },
  {
    id: 'npv-irr',
    name: 'NPV and IRR',
    subject: 'Corporate Issuers',
    topic: 'Capital Investments',
    prerequisites: ['tvm', 'wacc'],
    description: 'Net present value, internal rate of return, and project evaluation criteria.',
  },
  {
    id: 'capital-budgeting',
    name: 'Capital Budgeting Decisions',
    subject: 'Corporate Issuers',
    topic: 'Capital Investments',
    prerequisites: ['npv-irr'],
    description: 'Project ranking, mutually exclusive projects, capital rationing.',
  },
  {
    id: 'capital-structure',
    name: 'Capital Structure',
    subject: 'Corporate Issuers',
    topic: 'Capital Structure',
    prerequisites: ['wacc'],
    description: 'Modigliani-Miller, optimal leverage, trade-off and pecking order theories.',
  },
  {
    id: 'corporate-governance',
    name: 'Corporate Governance',
    subject: 'Corporate Issuers',
    topic: 'Corporate Governance',
    prerequisites: [],
    description: 'Board structure, stakeholder management, ESG considerations.',
  },

  // === Financial Statement Analysis (7 nodes) ===
  {
    id: 'income-statement',
    name: 'Income Statement Analysis',
    subject: 'Financial Statement Analysis',
    topic: 'Understanding Income Statements',
    prerequisites: [],
    description: 'Revenue recognition, expense classification, EPS calculations.',
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet Analysis',
    subject: 'Financial Statement Analysis',
    topic: 'Understanding Balance Sheets',
    prerequisites: [],
    description: 'Asset/liability classification, equity components, off-balance-sheet items.',
  },
  {
    id: 'cash-flow-statement',
    name: 'Cash Flow Statement',
    subject: 'Financial Statement Analysis',
    topic: 'Understanding Cash Flow Statements',
    prerequisites: ['income-statement', 'balance-sheet'],
    description: 'Operating, investing, financing activities; direct and indirect methods.',
  },
  {
    id: 'ratio-analysis',
    name: 'Financial Ratio Analysis',
    subject: 'Financial Statement Analysis',
    topic: 'Financial Analysis Techniques',
    prerequisites: ['income-statement', 'balance-sheet'],
    description: 'Liquidity, solvency, profitability, and activity ratios.',
  },
  {
    id: 'dupont-decomposition',
    name: 'DuPont Decomposition',
    subject: 'Financial Statement Analysis',
    topic: 'Financial Analysis Techniques',
    prerequisites: ['ratio-analysis'],
    description: 'ROE decomposition into margin, turnover, and leverage components.',
  },
  {
    id: 'working-capital',
    name: 'Working Capital Management',
    subject: 'Financial Statement Analysis',
    topic: 'Working Capital and Liquidity',
    prerequisites: ['balance-sheet'],
    description: 'Cash conversion cycle, receivables/inventory management, short-term financing.',
  },
  {
    id: 'financial-reporting-quality',
    name: 'Financial Reporting Quality',
    subject: 'Financial Statement Analysis',
    topic: 'Financial Reporting Quality',
    prerequisites: ['income-statement', 'cash-flow-statement'],
    description: 'Earnings quality assessment, red flags, manipulation detection.',
  },

  // === Equity Investments (5 nodes) ===
  {
    id: 'equity-markets',
    name: 'Equity Markets and Structures',
    subject: 'Equity Investments',
    topic: 'Market Organization and Structure',
    prerequisites: [],
    description: 'Market types, order types, market efficiency, and trading mechanisms.',
  },
  {
    id: 'equity-valuation-concepts',
    name: 'Equity Valuation Concepts',
    subject: 'Equity Investments',
    topic: 'Equity Valuation: Concepts and Basic Tools',
    prerequisites: ['tvm', 'income-statement'],
    description: 'Intrinsic value, DDM basics, relative valuation approaches.',
  },
  {
    id: 'ddm-models',
    name: 'Dividend Discount Models',
    subject: 'Equity Investments',
    topic: 'Equity Valuation: Concepts and Basic Tools',
    prerequisites: ['equity-valuation-concepts', 'tvm'],
    description: 'Gordon Growth Model, multi-stage DDM, and PVGO.',
  },
  {
    id: 'price-multiples',
    name: 'Price Multiples',
    subject: 'Equity Investments',
    topic: 'Equity Valuation: Concepts and Basic Tools',
    prerequisites: ['equity-valuation-concepts', 'ratio-analysis'],
    description: 'P/E, P/B, P/S, EV/EBITDA ratios and their interpretation.',
  },
  {
    id: 'industry-analysis',
    name: 'Industry and Company Analysis',
    subject: 'Equity Investments',
    topic: 'Introduction to Industry and Company Analysis',
    prerequisites: ['equity-markets'],
    description: 'Porter five forces, industry life cycle, competitive strategy analysis.',
  },

  // === Fixed Income (6 nodes) ===
  {
    id: 'bond-basics',
    name: 'Bond Basics',
    subject: 'Fixed Income',
    topic: 'Fixed-Income Instrument Features',
    prerequisites: [],
    description: 'Bond features, coupon structures, day-count conventions, and settlement.',
  },
  {
    id: 'bond-pricing',
    name: 'Bond Pricing',
    subject: 'Fixed Income',
    topic: 'Fixed-Income Cash Flows and Types',
    prerequisites: ['tvm', 'bond-basics'],
    description: 'Present value of cash flows, premium/discount pricing, accrued interest.',
  },
  {
    id: 'yield-measures',
    name: 'Yield Measures',
    subject: 'Fixed Income',
    topic: 'Fixed-Income Cash Flows and Types',
    prerequisites: ['bond-pricing'],
    description: 'YTM, current yield, yield to call, bond equivalent yield comparisons.',
  },
  {
    id: 'spot-forward-rates',
    name: 'Spot and Forward Rates',
    subject: 'Fixed Income',
    topic: 'Pricing and Valuation of Fixed Income',
    prerequisites: ['yield-measures'],
    description: 'Spot rate curve, bootstrapping, forward rate derivation, term structure.',
  },
  {
    id: 'duration',
    name: 'Duration and Convexity',
    subject: 'Fixed Income',
    topic: 'Understanding Fixed-Income Risk and Return',
    prerequisites: ['bond-pricing'],
    description: 'Macaulay, modified, and effective duration; convexity adjustment.',
  },
  {
    id: 'interest-rate-risk',
    name: 'Interest Rate Risk Management',
    subject: 'Fixed Income',
    topic: 'Understanding Fixed-Income Risk and Return',
    prerequisites: ['duration', 'spot-forward-rates'],
    description: 'Immunization, duration matching, key rate duration, and hedging strategies.',
  },

  // === Derivatives (5 nodes) ===
  {
    id: 'derivative-basics',
    name: 'Derivative Instrument Basics',
    subject: 'Derivatives',
    topic: 'Derivative Instrument and Derivative Market Features',
    prerequisites: [],
    description: 'Forwards, futures, options, swaps definitions and market structure.',
  },
  {
    id: 'forward-futures-pricing',
    name: 'Forward and Futures Pricing',
    subject: 'Derivatives',
    topic: 'Pricing and Valuation of Forward Commitments',
    prerequisites: ['derivative-basics', 'tvm'],
    description: 'Cost of carry, no-arbitrage pricing, basis and convergence.',
  },
  {
    id: 'options-basics',
    name: 'Options Fundamentals',
    subject: 'Derivatives',
    topic: 'Pricing and Valuation of Contingent Claims',
    prerequisites: ['derivative-basics'],
    description: 'Call/put payoffs, intrinsic value, time value, moneyness.',
  },
  {
    id: 'put-call-parity',
    name: 'Put-Call Parity',
    subject: 'Derivatives',
    topic: 'Pricing and Valuation of Contingent Claims',
    prerequisites: ['options-basics', 'tvm'],
    description: 'Parity relationship, synthetic positions, and arbitrage strategies.',
  },
  {
    id: 'option-greeks',
    name: 'Option Greeks and BSM',
    subject: 'Derivatives',
    topic: 'Pricing and Valuation of Contingent Claims',
    prerequisites: ['put-call-parity', 'distributions'],
    description: 'Black-Scholes-Merton model, delta, gamma, vega, theta sensitivities.',
  },

  // === Alternative Investments (3 nodes) ===
  {
    id: 'alt-investment-overview',
    name: 'Alternative Investments Overview',
    subject: 'Alternative Investments',
    topic: 'Alternative Investment Features',
    prerequisites: [],
    description: 'Categories: hedge funds, PE, real estate, commodities, infrastructure.',
  },
  {
    id: 'real-estate-valuation',
    name: 'Real Estate Valuation',
    subject: 'Alternative Investments',
    topic: 'Alternative Investment Features',
    prerequisites: ['alt-investment-overview', 'tvm'],
    description: 'Income approach, sales comparison, cost approach, cap rates, NOI.',
  },
  {
    id: 'private-equity',
    name: 'Private Equity and Venture Capital',
    subject: 'Alternative Investments',
    topic: 'Alternative Investment Features',
    prerequisites: ['alt-investment-overview', 'equity-valuation-concepts'],
    description: 'PE fund structure, LBO mechanics, VC stages, exit strategies.',
  },

  // === Portfolio Management (5 nodes) ===
  {
    id: 'portfolio-theory',
    name: 'Portfolio Theory',
    subject: 'Portfolio Management',
    topic: 'Portfolio Risk and Return: Part I',
    prerequisites: ['basic-statistics', 'tvm'],
    description: 'Expected return, variance, covariance, efficient frontier, diversification.',
  },
  {
    id: 'capm',
    name: 'Capital Asset Pricing Model',
    subject: 'Portfolio Management',
    topic: 'Portfolio Risk and Return: Part II',
    prerequisites: ['portfolio-theory'],
    description: 'Systematic vs. unsystematic risk, beta, security market line (SML).',
  },
  {
    id: 'sml-cml',
    name: 'SML and CML',
    subject: 'Portfolio Management',
    topic: 'Portfolio Risk and Return: Part II',
    prerequisites: ['capm'],
    description: 'Capital market line, security market line, market portfolio, Sharpe ratio.',
  },
  {
    id: 'factor-models',
    name: 'Factor Models',
    subject: 'Portfolio Management',
    topic: 'Portfolio Risk and Return: Part II',
    prerequisites: ['sml-cml', 'regression'],
    description: 'Single and multi-factor models, APT, Fama-French factors.',
  },
  {
    id: 'portfolio-planning',
    name: 'Portfolio Planning and IPS',
    subject: 'Portfolio Management',
    topic: 'Basics of Portfolio Planning and Construction',
    prerequisites: ['portfolio-theory'],
    description: 'Investment policy statement, objectives, constraints, asset allocation.',
  },

  // === Ethical and Professional Standards (4 nodes) ===
  {
    id: 'ethics-framework',
    name: 'Ethical Decision-Making Framework',
    subject: 'Ethical and Professional Standards',
    topic: 'Ethics and Trust in the Investment Industry',
    prerequisites: [],
    description: 'Code of Ethics, ethical vs. legal standards, trust in profession.',
  },
  {
    id: 'standards-of-practice',
    name: 'Standards of Professional Conduct',
    subject: 'Ethical and Professional Standards',
    topic: 'Guidance for Standards I-VII',
    prerequisites: ['ethics-framework'],
    description: 'Seven standards covering professionalism, integrity, duties to clients/employers.',
  },
  {
    id: 'gips',
    name: 'GIPS Standards',
    subject: 'Ethical and Professional Standards',
    topic: 'Introduction to GIPS',
    prerequisites: ['ethics-framework'],
    description: 'Global Investment Performance Standards for fair presentation of results.',
  },
  {
    id: 'fiduciary-duty',
    name: 'Fiduciary Duty and Suitability',
    subject: 'Ethical and Professional Standards',
    topic: 'Guidance for Standards I-VII',
    prerequisites: ['standards-of-practice'],
    description: 'Duty of loyalty, suitability assessments, priority of client interests.',
  },
];

/**
 * Build edges from the prerequisite arrays in concept nodes.
 * Each prerequisite relationship becomes a directed edge.
 */
function buildEdgesFromNodes(nodes: ConceptNode[]): ConceptEdge[] {
  const edges: ConceptEdge[] = [];
  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      edges.push({
        from: prereqId,
        to: node.id,
        relationship: 'prerequisite',
      });
    }
  }
  return edges;
}

/** Additional "related" edges between cross-subject concepts */
const RELATED_EDGES: ConceptEdge[] = [
  { from: 'wacc', to: 'capm', relationship: 'related' },
  { from: 'bond-pricing', to: 'equity-valuation-concepts', relationship: 'related' },
  { from: 'ratio-analysis', to: 'industry-analysis', relationship: 'related' },
  { from: 'monetary-policy', to: 'bond-pricing', relationship: 'related' },
  { from: 'duration', to: 'portfolio-theory', relationship: 'related' },
];

export const CONCEPT_EDGES: ConceptEdge[] = [
  ...buildEdgesFromNodes(CONCEPT_NODES),
  ...RELATED_EDGES,
];

export const CFA_KNOWLEDGE_GRAPH: KnowledgeGraphData = {
  nodes: CONCEPT_NODES,
  edges: CONCEPT_EDGES,
};

/** Lookup map from node ID to ConceptNode for fast access */
export const NODE_MAP: Map<string, ConceptNode> = new Map(
  CONCEPT_NODES.map((n) => [n.id, n])
);

/** Get all nodes for a specific subject */
export function getNodesBySubject(subject: string): ConceptNode[] {
  return CONCEPT_NODES.filter((n) => n.subject === subject);
}

/** Get all prerequisite edges (directed) */
export function getPrerequisiteEdges(): ConceptEdge[] {
  return CONCEPT_EDGES.filter((e) => e.relationship === 'prerequisite');
}
