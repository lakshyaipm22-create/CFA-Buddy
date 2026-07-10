import type { Question } from '../types';

/**
 * Sample CFA Level I questions for development/testing.
 * 50 questions across all 10 CFA L1 subjects (5 per subject).
 * Covers Easy/Medium/Hard difficulty levels.
 */
export const sampleQuestions: Question[] = [
  // ═══════════════════════════════════════════════════════════════
  // ETHICAL AND PROFESSIONAL STANDARDS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'ethics-1',
    questionText: 'According to the CFA Institute Code of Ethics, members must place the integrity of the investment profession and the interests of clients above:',
    answerChoices: [
      { label: 'A', text: 'Their own personal interests', isCorrect: true, explanation: 'The Code of Ethics requires members to place the integrity of the investment profession and the interests of clients above their own personal interests.' },
      { label: 'B', text: 'The interests of their employer only', isCorrect: false, explanation: 'The requirement is broader — it covers personal interests, not just employer interests.' },
      { label: 'C', text: 'Regulatory requirements', isCorrect: false, explanation: 'Members must comply with applicable laws and regulations; the Code does not ask them to place client interests above legal requirements.' },
    ],
    difficulty: 'Easy',
    subject: 'Ethical and Professional Standards',
    reading: 'Code of Ethics and Standards of Professional Conduct',
    topic: 'Code of Ethics',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'ethics-2',
    questionText: 'Standard III(B) Fair Dealing most likely requires that members and candidates:',
    answerChoices: [
      { label: 'A', text: 'Deal fairly and objectively with all clients when providing investment recommendations', isCorrect: true, explanation: 'Standard III(B) requires fair dealing with all clients in disseminating recommendations, changes, and taking investment action.' },
      { label: 'B', text: 'Treat all clients identically regardless of their fee arrangement', isCorrect: false, explanation: 'Fair dealing does not mean identical treatment. Different service levels for different fee arrangements are acceptable if disclosed.' },
      { label: 'C', text: 'Provide investment recommendations only to institutional clients', isCorrect: false, explanation: 'The standard applies to all clients, not a specific subset.' },
    ],
    difficulty: 'Medium',
    subject: 'Ethical and Professional Standards',
    reading: 'Guidance for Standards I-VII',
    topic: 'Standard III - Duties to Clients',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'ethics-3',
    questionText: 'An analyst covering a company discovers that the CEO is about to resign due to accounting fraud. The analyst has not yet published a report. Under Standard II(A) Material Nonpublic Information, the analyst should most appropriately:',
    answerChoices: [
      { label: 'A', text: 'Immediately sell the stock from all client portfolios', isCorrect: false, explanation: 'Trading on material nonpublic information violates Standard II(A).' },
      { label: 'B', text: 'Refrain from trading or causing others to trade based on the information', isCorrect: true, explanation: 'Standard II(A) prohibits acting or causing others to act on material nonpublic information. The analyst must not trade until the information becomes public.' },
      { label: 'C', text: 'Share the information only with the firm\'s compliance department and largest clients', isCorrect: false, explanation: 'Selectively disclosing MNPI to any clients violates the standard. Only compliance notification is appropriate.' },
    ],
    difficulty: 'Hard',
    subject: 'Ethical and Professional Standards',
    reading: 'Guidance for Standards I-VII',
    topic: 'Standard II - Integrity of Capital Markets',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // QUANTITATIVE METHODS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'qm-1',
    questionText: 'An investment earns 8% compounded annually. The number of years it will take for the investment to double in value is closest to:',
    answerChoices: [
      { label: 'A', text: '7.2 years', isCorrect: false, explanation: 'Using the Rule of 72: 72/8 = 9 years. Exact calculation: ln(2)/ln(1.08) = 9.01 years.' },
      { label: 'B', text: '9.0 years', isCorrect: true, explanation: 'Using the Rule of 72: 72/8 = 9 years. More precisely, ln(2)/ln(1.08) ≈ 9.01 years.' },
      { label: 'C', text: '12.5 years', isCorrect: false, explanation: '12.5 years would correspond to a lower rate of about 5.7% (72/12.5).' },
    ],
    difficulty: 'Easy',
    subject: 'Quantitative Methods',
    reading: 'The Time Value of Money in Finance',
    topic: 'TVM Concepts',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'qm-2',
    questionText: 'A portfolio has an expected annual return of 12% with a standard deviation of 20%. Assuming returns are normally distributed, the probability of a return less than -28% is closest to:',
    answerChoices: [
      { label: 'A', text: '2.5%', isCorrect: true, explanation: '-28% is two standard deviations below the mean: 12% - 2(20%) = -28%. For a normal distribution, approximately 2.5% of observations fall below 2 standard deviations below the mean.' },
      { label: 'B', text: '5.0%', isCorrect: false, explanation: '5% corresponds to approximately 1.65 standard deviations below the mean.' },
      { label: 'C', text: '16.0%', isCorrect: false, explanation: '16% corresponds to one standard deviation below the mean (-8%).' },
    ],
    difficulty: 'Medium',
    subject: 'Quantitative Methods',
    reading: 'Common Probability Distributions',
    topic: 'Normal Distribution',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'qm-3',
    questionText: 'A sample of 36 observations has a mean of 15 and a standard deviation of 6. The 95% confidence interval for the population mean is closest to:',
    answerChoices: [
      { label: 'A', text: '13.04 to 16.96', isCorrect: true, explanation: 'Standard error = 6/√36 = 1. For 95% CI: 15 ± 1.96(1) = 13.04 to 16.96.' },
      { label: 'B', text: '14.02 to 15.98', isCorrect: false, explanation: 'This would correspond to using 1.96 with a standard error that is too small.' },
      { label: 'C', text: '3.24 to 26.76', isCorrect: false, explanation: 'This uses the standard deviation (6) instead of the standard error (1) in the calculation.' },
    ],
    difficulty: 'Hard',
    subject: 'Quantitative Methods',
    reading: 'Sampling and Estimation',
    topic: 'Confidence Intervals',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // ECONOMICS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'econ-1',
    questionText: 'Which of the following market structures is characterized by many firms selling differentiated products?',
    answerChoices: [
      { label: 'A', text: 'Perfect competition', isCorrect: false, explanation: 'Perfect competition features many firms selling identical (homogeneous) products.' },
      { label: 'B', text: 'Monopolistic competition', isCorrect: true, explanation: 'Monopolistic competition is characterized by many firms selling differentiated products with relatively low barriers to entry.' },
      { label: 'C', text: 'Oligopoly', isCorrect: false, explanation: 'Oligopoly features a small number of firms with significant barriers to entry.' },
    ],
    difficulty: 'Easy',
    subject: 'Economics',
    reading: 'Firms and Market Structures',
    topic: 'Market Structures',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'econ-2',
    questionText: 'If the central bank increases the money supply while the economy is at full employment, the most likely long-run effect is:',
    answerChoices: [
      { label: 'A', text: 'An increase in real GDP', isCorrect: false, explanation: 'In the long run, monetary policy affects only nominal variables. Real GDP returns to potential output.' },
      { label: 'B', text: 'An increase in the price level with no change in real output', isCorrect: true, explanation: 'When the economy is at full employment, an increase in money supply shifts aggregate demand right, but the long-run aggregate supply is vertical at potential GDP. Only the price level rises.' },
      { label: 'C', text: 'A decrease in interest rates permanently', isCorrect: false, explanation: 'The Fisher effect suggests that in the long run, nominal interest rates adjust upward to reflect higher expected inflation.' },
    ],
    difficulty: 'Medium',
    subject: 'Economics',
    reading: 'Monetary and Fiscal Policy',
    topic: 'Monetary Policy',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'econ-3',
    questionText: 'A country with a current account deficit must have:',
    answerChoices: [
      { label: 'A', text: 'A capital account surplus (net capital inflow)', isCorrect: true, explanation: 'By the balance of payments identity, a current account deficit must be offset by a capital/financial account surplus. The country is a net borrower from abroad.' },
      { label: 'B', text: 'A fiscal deficit', isCorrect: false, explanation: 'While the twin deficits hypothesis links fiscal and current account deficits, a fiscal deficit is not required. Private sector savings-investment balance also matters.' },
      { label: 'C', text: 'A depreciating currency', isCorrect: false, explanation: 'A current account deficit does not necessarily cause currency depreciation in the short run due to capital flows supporting the currency.' },
    ],
    difficulty: 'Hard',
    subject: 'Economics',
    reading: 'International Trade and Capital Flows',
    topic: 'Balance of Payments',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // FINANCIAL STATEMENT ANALYSIS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'fsa-1',
    questionText: 'Which of the following is most likely found in the management commentary (MD&A)?',
    answerChoices: [
      { label: 'A', text: 'Forward-looking disclosures about the company\'s prospects', isCorrect: true, explanation: 'The management commentary (MD&A) is where management discusses forward-looking information, trends, risks, and prospects.' },
      { label: 'B', text: 'The basis of preparation for the financial statements', isCorrect: false, explanation: 'The basis of preparation is disclosed in the notes to the financial statements.' },
      { label: 'C', text: 'An opinion on whether the financial statements are free from material misstatement', isCorrect: false, explanation: 'This is the objective of the external auditor\'s report, not management commentary.' },
    ],
    difficulty: 'Easy',
    subject: 'Financial Statement Analysis',
    reading: 'Introduction to Financial Statement Analysis',
    topic: 'Financial Reporting',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'fsa-2',
    questionText: 'Under IFRS, research costs are:',
    answerChoices: [
      { label: 'A', text: 'Capitalized as an intangible asset', isCorrect: false, explanation: 'Under IFRS, only development costs that meet specific criteria can be capitalized. Research costs must be expensed.' },
      { label: 'B', text: 'Expensed as incurred', isCorrect: true, explanation: 'Under IFRS (IAS 38), research costs must be expensed as incurred because there is insufficient certainty that future economic benefits will flow to the entity at the research stage.' },
      { label: 'C', text: 'Either capitalized or expensed at management\'s discretion', isCorrect: false, explanation: 'There is no choice — IFRS mandates expensing research costs. Only development costs may be capitalized if criteria are met.' },
    ],
    difficulty: 'Medium',
    subject: 'Financial Statement Analysis',
    reading: 'Long-Lived Assets',
    topic: 'Intangible Assets',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'fsa-3',
    questionText: 'A company changes its inventory method from FIFO to weighted average cost during a period of rising prices. Compared to FIFO, the change will most likely result in:',
    answerChoices: [
      { label: 'A', text: 'Higher cost of goods sold and lower ending inventory', isCorrect: true, explanation: 'In a period of rising prices, FIFO assigns oldest (lower) costs to COGS. Switching to weighted average increases COGS (higher average cost vs. old FIFO cost) and decreases ending inventory.' },
      { label: 'B', text: 'Lower cost of goods sold and higher gross profit', isCorrect: false, explanation: 'This would be the effect of switching FROM weighted average TO FIFO during rising prices.' },
      { label: 'C', text: 'No effect on cost of goods sold or gross profit', isCorrect: false, explanation: 'The inventory costing method directly affects COGS and gross profit when prices are changing.' },
    ],
    difficulty: 'Hard',
    subject: 'Financial Statement Analysis',
    reading: 'Inventories',
    topic: 'Inventory Valuation Methods',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // CORPORATE ISSUERS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'ci-1',
    questionText: 'The primary goal of corporate governance is most accurately described as:',
    answerChoices: [
      { label: 'A', text: 'Maximizing short-term shareholder returns', isCorrect: false, explanation: 'Corporate governance focuses on long-term value creation, not short-term returns.' },
      { label: 'B', text: 'Ensuring that management acts in the best interests of shareholders and other stakeholders', isCorrect: true, explanation: 'Corporate governance establishes the system of controls and procedures to manage conflicts of interest and ensure management acts in the best interests of shareholders and stakeholders.' },
      { label: 'C', text: 'Minimizing regulatory compliance costs', isCorrect: false, explanation: 'Governance is about accountability and alignment of interests, not cost minimization.' },
    ],
    difficulty: 'Easy',
    subject: 'Corporate Issuers',
    reading: 'Corporate Governance and ESG',
    topic: 'Corporate Governance',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'ci-2',
    questionText: 'A company\'s weighted average cost of capital (WACC) is most likely to decrease if:',
    answerChoices: [
      { label: 'A', text: 'The company increases its proportion of debt financing (assuming the tax shield benefit exceeds increased financial risk)', isCorrect: true, explanation: 'Up to an optimal level, increasing debt proportion reduces WACC because after-tax cost of debt is typically lower than cost of equity due to the tax deductibility of interest.' },
      { label: 'B', text: 'The company\'s equity beta increases', isCorrect: false, explanation: 'A higher equity beta increases the cost of equity (via CAPM), which would increase WACC.' },
      { label: 'C', text: 'The corporate tax rate decreases', isCorrect: false, explanation: 'A lower tax rate reduces the tax shield on debt, making after-tax cost of debt higher and increasing WACC.' },
    ],
    difficulty: 'Medium',
    subject: 'Corporate Issuers',
    reading: 'Cost of Capital',
    topic: 'Weighted Average Cost of Capital',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'ci-3',
    questionText: 'When evaluating a capital project using NPV, a project should be accepted if its NPV is:',
    answerChoices: [
      { label: 'A', text: 'Greater than the IRR', isCorrect: false, explanation: 'NPV is a dollar amount while IRR is a percentage rate; they cannot be directly compared this way.' },
      { label: 'B', text: 'Greater than zero', isCorrect: true, explanation: 'A positive NPV means the project earns more than the required rate of return (WACC) and creates value for shareholders.' },
      { label: 'C', text: 'Greater than the initial investment', isCorrect: false, explanation: 'NPV already accounts for the initial investment. A positive NPV means value creation beyond the required return.' },
    ],
    difficulty: 'Easy',
    subject: 'Corporate Issuers',
    reading: 'Capital Budgeting',
    topic: 'NPV and IRR',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // EQUITY INVESTMENTS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'equity-1',
    questionText: 'In an informationally efficient market, the price of a security most accurately reflects:',
    answerChoices: [
      { label: 'A', text: 'Only historical trading data', isCorrect: false, explanation: 'This describes only weak-form efficiency. An efficient market in general reflects all available information.' },
      { label: 'B', text: 'All available information quickly and rationally', isCorrect: true, explanation: 'Market efficiency means prices reflect all available information rapidly and rationally. Investors cannot consistently earn abnormal returns using available information.' },
      { label: 'C', text: 'Only publicly available financial statements', isCorrect: false, explanation: 'This is too narrow. Semi-strong efficiency includes all public information, and strong-form includes private information as well.' },
    ],
    difficulty: 'Easy',
    subject: 'Equity Investments',
    reading: 'Market Efficiency',
    topic: 'Efficient Market Hypothesis',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'equity-2',
    questionText: 'Using the Gordon Growth Model (constant growth DDM), a stock with a dividend of $2.00 next year, a required return of 10%, and a constant growth rate of 4% has an intrinsic value closest to:',
    answerChoices: [
      { label: 'A', text: '$20.00', isCorrect: false, explanation: '$20 would result from dividing by the required return only ($2/0.10), ignoring growth.' },
      { label: 'B', text: '$33.33', isCorrect: true, explanation: 'Gordon Growth Model: V₀ = D₁/(r-g) = $2.00/(0.10-0.04) = $2.00/0.06 = $33.33.' },
      { label: 'C', text: '$50.00', isCorrect: false, explanation: '$50 would result from $2.00/0.04, which incorrectly uses only the growth rate.' },
    ],
    difficulty: 'Medium',
    subject: 'Equity Investments',
    reading: 'Equity Valuation: Concepts and Basic Tools',
    topic: 'Dividend Discount Models',
    provider: 'schweser',
    questionSourceFile: null,
  },

  {
    id: 'equity-3',
    questionText: 'A company has a trailing P/E ratio of 18 and an expected earnings growth rate of 12%. Its PEG ratio is closest to:',
    answerChoices: [
      { label: 'A', text: '0.67', isCorrect: false, explanation: '0.67 would be 12/18, which inverts the formula.' },
      { label: 'B', text: '1.50', isCorrect: true, explanation: 'PEG ratio = P/E ratio / Earnings growth rate = 18/12 = 1.50. A PEG above 1.0 may indicate the stock is overvalued relative to its growth.' },
      { label: 'C', text: '2.16', isCorrect: false, explanation: '2.16 would result from multiplying P/E by growth rate (18 × 0.12).' },
    ],
    difficulty: 'Medium',
    subject: 'Equity Investments',
    reading: 'Equity Valuation: Concepts and Basic Tools',
    topic: 'Price Multiples',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // FIXED INCOME (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'fi-1',
    questionText: 'The price of a fixed-rate bond is inversely related to:',
    answerChoices: [
      { label: 'A', text: 'Its coupon rate', isCorrect: false, explanation: 'A higher coupon rate increases the bond price, all else equal (direct relationship).' },
      { label: 'B', text: 'The market yield (discount rate)', isCorrect: true, explanation: 'Bond prices and market yields move inversely. When yields rise, the present value of future cash flows decreases, reducing the bond price.' },
      { label: 'C', text: 'The bond\'s credit rating', isCorrect: false, explanation: 'A higher credit rating generally means lower required yield and therefore higher price (direct relationship).' },
    ],
    difficulty: 'Easy',
    subject: 'Fixed Income',
    reading: 'Fixed-Income Markets: Issuance, Trading, and Funding',
    topic: 'Bond Price-Yield Relationship',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'fi-2',
    questionText: 'A bond with a Macaulay duration of 7.2 years and a yield to maturity of 5% has a modified duration closest to:',
    answerChoices: [
      { label: 'A', text: '6.86', isCorrect: true, explanation: 'Modified duration = Macaulay duration / (1 + yield) = 7.2 / 1.05 ≈ 6.857, or approximately 6.86.' },
      { label: 'B', text: '7.56', isCorrect: false, explanation: '7.56 would result from multiplying (7.2 × 1.05), which is incorrect.' },
      { label: 'C', text: '7.20', isCorrect: false, explanation: 'Modified duration is always less than Macaulay duration (for positive yields), not equal to it.' },
    ],
    difficulty: 'Medium',
    subject: 'Fixed Income',
    reading: 'Understanding Fixed-Income Risk and Return',
    topic: 'Duration',
    provider: 'schweser',
    questionSourceFile: null,
  },
  {
    id: 'fi-3',
    questionText: 'A callable bond will most likely be called by the issuer when interest rates have:',
    answerChoices: [
      { label: 'A', text: 'Increased significantly since issuance', isCorrect: false, explanation: 'When rates rise, the issuer would be refinancing at a higher rate — there is no incentive to call.' },
      { label: 'B', text: 'Decreased significantly since issuance', isCorrect: true, explanation: 'When interest rates fall, issuers can call existing high-coupon bonds and refinance at lower rates, reducing borrowing costs.' },
      { label: 'C', text: 'Remained unchanged since issuance', isCorrect: false, explanation: 'If rates are unchanged, there is no economic benefit to calling and reissuing.' },
    ],
    difficulty: 'Easy',
    subject: 'Fixed Income',
    reading: 'Fixed-Income Markets: Issuance, Trading, and Funding',
    topic: 'Callable Bonds',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // DERIVATIVES (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'deriv-1',
    questionText: 'The buyer of a put option has the right to:',
    answerChoices: [
      { label: 'A', text: 'Buy the underlying asset at the strike price', isCorrect: false, explanation: 'This describes a call option buyer. A put gives the right to sell.' },
      { label: 'B', text: 'Sell the underlying asset at the strike price', isCorrect: true, explanation: 'A put option gives its buyer the right, but not the obligation, to sell the underlying asset at the strike price on or before expiration.' },
      { label: 'C', text: 'Sell the underlying asset at the market price', isCorrect: false, explanation: 'You can always sell at market price without an option. The put gives the right to sell at the predetermined strike price.' },
    ],
    difficulty: 'Easy',
    subject: 'Derivatives',
    reading: 'Derivative Markets and Instruments',
    topic: 'Options Basics',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'deriv-2',
    questionText: 'An investor holds a stock currently trading at $50 and buys a protective put with a strike price of $45 for a premium of $3. The maximum loss on this combined position is:',
    answerChoices: [
      { label: 'A', text: '$3', isCorrect: false, explanation: '$3 is only the put premium. The loss also includes the decline in stock value from $50 to the strike price of $45.' },
      { label: 'B', text: '$8', isCorrect: true, explanation: 'Maximum loss = (Stock price - Strike price) + Put premium = ($50 - $45) + $3 = $8. The put limits downside to the strike price, but cost of stock decline to strike plus premium paid is the total risk.' },
      { label: 'C', text: '$5', isCorrect: false, explanation: '$5 is only the loss on the stock down to the strike price, ignoring the premium paid for protection.' },
    ],
    difficulty: 'Medium',
    subject: 'Derivatives',
    reading: 'Derivative Markets and Instruments',
    topic: 'Option Strategies',
    provider: 'schweser',
    questionSourceFile: null,
  },

  {
    id: 'deriv-3',
    questionText: 'The value of a forward contract at expiration to the long position is best described as:',
    answerChoices: [
      { label: 'A', text: 'The forward price minus the spot price', isCorrect: false, explanation: 'This is the payoff to the short position (F - S).' },
      { label: 'B', text: 'The spot price minus the forward price', isCorrect: true, explanation: 'At expiration, the long position profits when the spot price (S_T) exceeds the forward price (F₀): Payoff = S_T - F₀.' },
      { label: 'C', text: 'The present value of the forward price', isCorrect: false, explanation: 'The value at expiration does not require discounting — it is the simple difference between spot and forward prices.' },
    ],
    difficulty: 'Medium',
    subject: 'Derivatives',
    reading: 'Basics of Derivative Pricing and Valuation',
    topic: 'Forward Contract Valuation',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // ALTERNATIVE INVESTMENTS (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'ai-1',
    questionText: 'Compared to traditional investments, alternative investments are most likely characterized by:',
    answerChoices: [
      { label: 'A', text: 'Higher liquidity and lower fees', isCorrect: false, explanation: 'Alternative investments typically have lower liquidity and higher fees than traditional investments.' },
      { label: 'B', text: 'Lower liquidity and less transparency', isCorrect: true, explanation: 'Alternative investments (hedge funds, PE, real assets) generally have lower liquidity, less transparency, higher fees, and less regulation compared to public equities and bonds.' },
      { label: 'C', text: 'More regulatory oversight and daily pricing', isCorrect: false, explanation: 'Alternatives typically have less regulation and may only be valued periodically (quarterly for PE/real estate).' },
    ],
    difficulty: 'Easy',
    subject: 'Alternative Investments',
    reading: 'Introduction to Alternative Investments',
    topic: 'Characteristics of Alternatives',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'ai-2',
    questionText: 'In private equity, the J-curve effect refers to the tendency for:',
    answerChoices: [
      { label: 'A', text: 'Returns to be high in early years and decline over time', isCorrect: false, explanation: 'The J-curve shows the opposite pattern — losses early, gains later.' },
      { label: 'B', text: 'Fund returns to be negative in early years and positive in later years', isCorrect: true, explanation: 'The J-curve reflects early negative returns (due to management fees, capital calls, and investments at cost) followed by positive returns as portfolio companies mature and are exited.' },
      { label: 'C', text: 'Commitment amounts to exceed invested capital', isCorrect: false, explanation: 'This relates to the drawdown/commitment structure, not the J-curve of returns over time.' },
    ],
    difficulty: 'Medium',
    subject: 'Alternative Investments',
    reading: 'Introduction to Alternative Investments',
    topic: 'Private Equity',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'ai-3',
    questionText: 'A hedge fund that uses a "2 and 20" fee structure charges:',
    answerChoices: [
      { label: 'A', text: '2% performance fee and 20% management fee', isCorrect: false, explanation: 'The terms are reversed. "2 and 20" means 2% management, 20% performance.' },
      { label: 'B', text: '2% management fee and 20% performance fee on profits', isCorrect: true, explanation: '"2 and 20" is the traditional hedge fund fee structure: 2% annual management fee on assets under management, plus 20% performance/incentive fee on profits above the high-water mark.' },
      { label: 'C', text: '2% of profits and 20% of assets under management', isCorrect: false, explanation: 'This reverses the structure. Management fees are on AUM; performance fees are on profits.' },
    ],
    difficulty: 'Easy',
    subject: 'Alternative Investments',
    reading: 'Introduction to Alternative Investments',
    topic: 'Hedge Fund Fees',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // PORTFOLIO MANAGEMENT (3 questions)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'pm-1',
    questionText: 'The primary benefit of diversification in portfolio management is:',
    answerChoices: [
      { label: 'A', text: 'Eliminating all investment risk', isCorrect: false, explanation: 'Diversification eliminates unsystematic (specific) risk but cannot eliminate systematic (market) risk.' },
      { label: 'B', text: 'Reducing portfolio risk without necessarily reducing expected return', isCorrect: true, explanation: 'Diversification combines assets with less than perfect positive correlation, reducing total portfolio risk (standard deviation) while maintaining or improving expected returns.' },
      { label: 'C', text: 'Guaranteeing a minimum return level', isCorrect: false, explanation: 'Diversification does not guarantee returns. It reduces the volatility of outcomes.' },
    ],
    difficulty: 'Easy',
    subject: 'Portfolio Management',
    reading: 'Portfolio Risk and Return: Part I',
    topic: 'Diversification',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'pm-2',
    questionText: 'According to the Capital Asset Pricing Model (CAPM), the expected return of a security is determined by its:',
    answerChoices: [
      { label: 'A', text: 'Total risk (standard deviation)', isCorrect: false, explanation: 'CAPM prices only systematic risk (beta), not total risk. Unsystematic risk can be diversified away.' },
      { label: 'B', text: 'Systematic risk (beta) relative to the market portfolio', isCorrect: true, explanation: 'CAPM: E(R) = Rf + β(E(Rm) - Rf). Only systematic risk (beta) is priced because investors can eliminate unsystematic risk through diversification.' },
      { label: 'C', text: 'Historical average return', isCorrect: false, explanation: 'CAPM is forward-looking and based on systematic risk exposure, not past returns.' },
    ],
    difficulty: 'Medium',
    subject: 'Portfolio Management',
    reading: 'Portfolio Risk and Return: Part II',
    topic: 'Capital Asset Pricing Model',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  {
    id: 'pm-3',
    questionText: 'An investor with a portfolio beta of 1.3, a risk-free rate of 3%, and a market risk premium of 7% has an expected portfolio return closest to:',
    answerChoices: [
      { label: 'A', text: '9.1%', isCorrect: false, explanation: '9.1% would be 1.3 × 7%, ignoring the risk-free rate component.' },
      { label: 'B', text: '12.1%', isCorrect: true, explanation: 'Using CAPM: E(R) = Rf + β(Market Risk Premium) = 3% + 1.3(7%) = 3% + 9.1% = 12.1%.' },
      { label: 'C', text: '13.0%', isCorrect: false, explanation: '13% would result from 1.3 × 10% (adding Rf to market risk premium before multiplying by beta).' },
    ],
    difficulty: 'Medium',
    subject: 'Portfolio Management',
    reading: 'Portfolio Risk and Return: Part II',
    topic: 'Capital Asset Pricing Model',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL QUESTIONS — Round 2 (2 per subject = 20 more)
  // ═══════════════════════════════════════════════════════════════

  // Ethics additional
  {
    id: 'ethics-4',
    questionText: 'Under Standard V(A) Diligence and Reasonable Basis, an analyst who uses third-party research must most likely:',
    answerChoices: [
      { label: 'A', text: 'Conduct their own independent verification of all facts', isCorrect: false, explanation: 'Complete independent verification is not required, but the analyst must evaluate the quality of the research.' },
      { label: 'B', text: 'Have a reasonable basis for believing the research is sound', isCorrect: true, explanation: 'Standard V(A) requires a reasonable basis. When using third-party research, analysts must evaluate its objectivity, independence, and thoroughness.' },
      { label: 'C', text: 'Disclose that the recommendation is based on third-party research', isCorrect: false, explanation: 'While disclosure may be good practice, the primary requirement is having a reasonable basis for the recommendation.' },
    ],
    difficulty: 'Medium',
    subject: 'Ethical and Professional Standards',
    reading: 'Guidance for Standards I-VII',
    topic: 'Standard V - Investment Analysis',
    provider: 'schweser',
    questionSourceFile: null,
  },
  {
    id: 'ethics-5',
    questionText: 'A portfolio manager allocates shares from a hot IPO to personal accounts before filling client orders. This most likely violates:',
    answerChoices: [
      { label: 'A', text: 'Standard III(A) Loyalty, Prudence, and Care', isCorrect: false, explanation: 'While this standard is relevant, the specific violation of priority of transactions is addressed in VI(B).' },
      { label: 'B', text: 'Standard VI(B) Priority of Transactions', isCorrect: true, explanation: 'Standard VI(B) requires that transactions for clients and employers take priority over personal transactions. Front-running client orders is a clear violation.' },
      { label: 'C', text: 'Standard II(B) Market Manipulation', isCorrect: false, explanation: 'Market manipulation involves actions designed to distort prices, not personal front-running of client orders.' },
    ],
    difficulty: 'Medium',
    subject: 'Ethical and Professional Standards',
    reading: 'Guidance for Standards I-VII',
    topic: 'Standard VI - Conflicts of Interest',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // QM additional
  {
    id: 'qm-4',
    questionText: 'The coefficient of variation (CV) is best described as a measure of:',
    answerChoices: [
      { label: 'A', text: 'Relative dispersion that allows comparison across different data sets', isCorrect: true, explanation: 'CV = standard deviation / mean. It measures relative dispersion, making it useful for comparing risk across investments with different expected returns.' },
      { label: 'B', text: 'The absolute spread of observations around the mean', isCorrect: false, explanation: 'This describes standard deviation or variance, not CV which measures relative dispersion.' },
      { label: 'C', text: 'The probability of returns falling below a target', isCorrect: false, explanation: 'This describes shortfall risk or Roy\'s Safety-First criterion, not the coefficient of variation.' },
    ],
    difficulty: 'Easy',
    subject: 'Quantitative Methods',
    reading: 'Statistical Measures of Asset Returns',
    topic: 'Measures of Dispersion',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'qm-5',
    questionText: 'A Type I error in hypothesis testing occurs when:',
    answerChoices: [
      { label: 'A', text: 'The null hypothesis is rejected when it is actually true', isCorrect: true, explanation: 'A Type I error (false positive) occurs when we reject a true null hypothesis. The probability of this error equals the significance level (alpha).' },
      { label: 'B', text: 'The null hypothesis is not rejected when it is actually false', isCorrect: false, explanation: 'This describes a Type II error (false negative), not a Type I error.' },
      { label: 'C', text: 'The test statistic falls within the confidence interval', isCorrect: false, explanation: 'When the test statistic falls within the confidence interval (non-rejection region), we fail to reject H₀, which is not necessarily an error.' },
    ],
    difficulty: 'Easy',
    subject: 'Quantitative Methods',
    reading: 'Hypothesis Testing',
    topic: 'Type I and Type II Errors',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // Economics additional
  {
    id: 'econ-4',
    questionText: 'According to the quantity theory of money, if the velocity of money is stable and real output is at full employment, an increase in the money supply will most likely result in:',
    answerChoices: [
      { label: 'A', text: 'A proportional increase in the price level', isCorrect: true, explanation: 'MV = PY. With V stable and Y fixed at full employment, any increase in M must lead to a proportional increase in P (inflation).' },
      { label: 'B', text: 'An increase in real GDP', isCorrect: false, explanation: 'At full employment, real GDP cannot increase further. The economy is on the vertical long-run AS curve.' },
      { label: 'C', text: 'A decrease in the velocity of money', isCorrect: false, explanation: 'The premise states velocity is stable. The quantity theory assumes V is determined by institutional factors, not money supply.' },
    ],
    difficulty: 'Medium',
    subject: 'Economics',
    reading: 'Monetary and Fiscal Policy',
    topic: 'Quantity Theory of Money',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'econ-5',
    questionText: 'In a flexible exchange rate system, expansionary fiscal policy is most likely to cause the domestic currency to:',
    answerChoices: [
      { label: 'A', text: 'Appreciate due to higher interest rates attracting capital inflows', isCorrect: true, explanation: 'Fiscal expansion raises interest rates (crowding out), attracting foreign capital inflows, increasing demand for the domestic currency, causing appreciation.' },
      { label: 'B', text: 'Depreciate due to increased imports from higher income', isCorrect: false, explanation: 'While imports may increase, the interest rate/capital flow effect typically dominates in the short run.' },
      { label: 'C', text: 'Remain unchanged because fiscal policy does not affect exchange rates', isCorrect: false, explanation: 'Fiscal policy affects exchange rates through interest rate differentials and capital flows.' },
    ],
    difficulty: 'Hard',
    subject: 'Economics',
    reading: 'Currency Exchange Rates',
    topic: 'Exchange Rate Determination',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // FSA additional
  {
    id: 'fsa-4',
    questionText: 'A company reports operating cash flow of $500M but has been consistently capitalizing costs that should be expensed. Compared to correct treatment, reported operating cash flow is most likely:',
    answerChoices: [
      { label: 'A', text: 'Overstated because capitalized costs appear in investing activities', isCorrect: true, explanation: 'When costs are capitalized rather than expensed, they are classified as investing cash outflows instead of operating. This inflates operating cash flow and understates investing cash flow.' },
      { label: 'B', text: 'Understated because capitalization increases depreciation', isCorrect: false, explanation: 'While depreciation increases, it is a non-cash charge added back to operating cash flow. The key impact is the initial classification of the cash outflow.' },
      { label: 'C', text: 'Unaffected because total cash flow is the same', isCorrect: false, explanation: 'While total cash flow is unchanged, the classification between operating and investing is materially affected.' },
    ],
    difficulty: 'Hard',
    subject: 'Financial Statement Analysis',
    reading: 'Understanding Cash Flow Statements',
    topic: 'Cash Flow Classification',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'fsa-5',
    questionText: 'The current ratio is defined as:',
    answerChoices: [
      { label: 'A', text: 'Current assets divided by current liabilities', isCorrect: true, explanation: 'The current ratio = Current Assets / Current Liabilities. It measures a company\'s ability to meet short-term obligations with short-term assets.' },
      { label: 'B', text: 'Cash and equivalents divided by current liabilities', isCorrect: false, explanation: 'This describes the cash ratio, which is more restrictive than the current ratio.' },
      { label: 'C', text: 'Total assets divided by total liabilities', isCorrect: false, explanation: 'This is a solvency measure, not a liquidity ratio. The current ratio focuses on short-term items only.' },
    ],
    difficulty: 'Easy',
    subject: 'Financial Statement Analysis',
    reading: 'Financial Analysis Techniques',
    topic: 'Liquidity Ratios',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // Corporate Issuers additional
  {
    id: 'ci-4',
    questionText: 'The pecking order theory of capital structure suggests that companies prefer financing in the following order:',
    answerChoices: [
      { label: 'A', text: 'Internal funds, then debt, then equity', isCorrect: true, explanation: 'The pecking order theory states firms prefer internal financing first (retained earnings), then debt, and finally equity as a last resort due to information asymmetry costs.' },
      { label: 'B', text: 'Equity, then debt, then internal funds', isCorrect: false, explanation: 'This is the reverse of the pecking order. Equity is actually the least preferred due to adverse selection problems.' },
      { label: 'C', text: 'Debt, then equity, then internal funds', isCorrect: false, explanation: 'Internal funds are preferred first because they involve no transaction costs or information disclosure.' },
    ],
    difficulty: 'Medium',
    subject: 'Corporate Issuers',
    reading: 'Capital Structure',
    topic: 'Capital Structure Theories',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'ci-5',
    questionText: 'A company with a higher degree of operating leverage (DOL) will most likely experience:',
    answerChoices: [
      { label: 'A', text: 'Greater percentage change in operating income for a given change in revenue', isCorrect: true, explanation: 'High DOL means a larger proportion of fixed costs. When revenue changes, operating income changes by a larger percentage due to the fixed cost structure amplifying the effect.' },
      { label: 'B', text: 'Lower business risk', isCorrect: false, explanation: 'Higher DOL increases business risk because earnings are more volatile relative to sales changes.' },
      { label: 'C', text: 'More stable operating margins across business cycles', isCorrect: false, explanation: 'High fixed costs mean margins fluctuate more with volume changes, making them less stable.' },
    ],
    difficulty: 'Medium',
    subject: 'Corporate Issuers',
    reading: 'Measures of Leverage',
    topic: 'Operating Leverage',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // Equity additional
  {
    id: 'equity-4',
    questionText: 'The enterprise value (EV) of a company is calculated as:',
    answerChoices: [
      { label: 'A', text: 'Market cap + Total debt - Cash and equivalents', isCorrect: true, explanation: 'EV = Market Capitalization + Total Debt + Preferred Stock + Minority Interest - Cash and Cash Equivalents. The simplified formula is Market Cap + Debt - Cash.' },
      { label: 'B', text: 'Market cap + Cash - Total debt', isCorrect: false, explanation: 'This reverses the treatment of cash and debt. Cash is subtracted because a buyer acquires the cash.' },
      { label: 'C', text: 'Total assets minus total liabilities', isCorrect: false, explanation: 'This is book value of equity, not enterprise value which uses market values.' },
    ],
    difficulty: 'Easy',
    subject: 'Equity Investments',
    reading: 'Equity Valuation: Concepts and Basic Tools',
    topic: 'Enterprise Value',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'equity-5',
    questionText: 'An analyst observes that a stock\'s price consistently overreacts to earnings announcements and then reverts. This is most consistent with:',
    answerChoices: [
      { label: 'A', text: 'The efficient market hypothesis', isCorrect: false, explanation: 'EMH predicts that prices quickly and accurately reflect new information without consistent overreaction patterns.' },
      { label: 'B', text: 'Behavioral finance overreaction bias', isCorrect: true, explanation: 'Consistent overreaction followed by reversal is a behavioral anomaly. Investors overweight dramatic information, pushing prices beyond intrinsic value before mean reversion occurs.' },
      { label: 'C', text: 'The random walk theory', isCorrect: false, explanation: 'Random walk theory implies price changes are unpredictable; a consistent pattern of overreaction contradicts this.' },
    ],
    difficulty: 'Medium',
    subject: 'Equity Investments',
    reading: 'Market Efficiency',
    topic: 'Behavioral Finance',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // Fixed Income additional
  {
    id: 'fi-4',
    questionText: 'Convexity is important to bond investors because it describes how:',
    answerChoices: [
      { label: 'A', text: 'Duration changes as yields change, providing a better price estimate for large yield changes', isCorrect: true, explanation: 'Duration provides a linear approximation of price-yield relationship. Convexity captures the curvature, improving estimates for large yield moves. Positive convexity benefits bondholders.' },
      { label: 'B', text: 'The coupon rate affects the bond price', isCorrect: false, explanation: 'The coupon rate\'s effect on price is captured by basic bond valuation, not the concept of convexity.' },
      { label: 'C', text: 'Credit risk changes over the life of a bond', isCorrect: false, explanation: 'Convexity relates to interest rate risk (the price-yield relationship), not credit risk.' },
    ],
    difficulty: 'Medium',
    subject: 'Fixed Income',
    reading: 'Understanding Fixed-Income Risk and Return',
    topic: 'Convexity',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'fi-5',
    questionText: 'A zero-coupon bond with 5 years to maturity has a Macaulay duration of:',
    answerChoices: [
      { label: 'A', text: '5 years', isCorrect: true, explanation: 'A zero-coupon bond\'s Macaulay duration always equals its time to maturity because there is only one cash flow (at maturity), so the weighted average time to receive cash flows is simply the maturity.' },
      { label: 'B', text: 'Less than 5 years', isCorrect: false, explanation: 'Only coupon-paying bonds have Macaulay duration less than maturity. Zero-coupon bonds have duration exactly equal to maturity.' },
      { label: 'C', text: 'Greater than 5 years', isCorrect: false, explanation: 'Macaulay duration cannot exceed maturity for any bond. For zeros, it equals maturity exactly.' },
    ],
    difficulty: 'Easy',
    subject: 'Fixed Income',
    reading: 'Understanding Fixed-Income Risk and Return',
    topic: 'Duration',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // Derivatives additional
  {
    id: 'deriv-4',
    questionText: 'Put-call parity for European options on a non-dividend-paying stock is expressed as:',
    answerChoices: [
      { label: 'A', text: 'Call + PV(Strike) = Put + Stock', isCorrect: true, explanation: 'Put-call parity: C + PV(X) = P + S. A fiduciary call (call + bond) replicates a protective put (put + stock) at expiration.' },
      { label: 'B', text: 'Call + Stock = Put + PV(Strike)', isCorrect: false, explanation: 'This rearrangement is incorrect. The correct form is C + PV(X) = P + S.' },
      { label: 'C', text: 'Call - Put = Stock - Strike', isCorrect: false, explanation: 'This ignores the present value discounting of the strike price, which is essential to put-call parity.' },
    ],
    difficulty: 'Medium',
    subject: 'Derivatives',
    reading: 'Basics of Derivative Pricing and Valuation',
    topic: 'Put-Call Parity',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'deriv-5',
    questionText: 'A swap is best described as:',
    answerChoices: [
      { label: 'A', text: 'A series of forward contracts with different settlement dates', isCorrect: true, explanation: 'An interest rate swap can be decomposed into a series of forward rate agreements (FRAs), each settling on a different date. This equivalence is fundamental to swap pricing.' },
      { label: 'B', text: 'An option that gives the right to enter into a futures contract', isCorrect: false, explanation: 'This describes a futures option (option on futures), not a swap.' },
      { label: 'C', text: 'A single forward contract with multiple deliverable assets', isCorrect: false, explanation: 'A swap involves multiple periodic exchanges, not a single forward delivery of multiple assets.' },
    ],
    difficulty: 'Easy',
    subject: 'Derivatives',
    reading: 'Derivative Markets and Instruments',
    topic: 'Swap Contracts',
    provider: 'curriculum',
    questionSourceFile: null,
  },

  // Alternative Investments additional
  {
    id: 'ai-4',
    questionText: 'The net asset value (NAV) of a real estate investment trust (REIT) is calculated by:',
    answerChoices: [
      { label: 'A', text: 'Estimating the market value of properties minus liabilities', isCorrect: true, explanation: 'REIT NAV = Estimated market value of all real estate assets + Other assets - Total liabilities. It represents the intrinsic per-share value based on property appraisals.' },
      { label: 'B', text: 'Dividing total revenue by shares outstanding', isCorrect: false, explanation: 'Revenue divided by shares gives revenue per share, not NAV. NAV is asset-based.' },
      { label: 'C', text: 'Using the book value of properties from financial statements', isCorrect: false, explanation: 'NAV uses estimated market values, not historical book values, because real estate appreciates and book values become outdated.' },
    ],
    difficulty: 'Medium',
    subject: 'Alternative Investments',
    reading: 'Introduction to Alternative Investments',
    topic: 'Real Estate Investment Trusts',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'ai-5',
    questionText: 'Commodities differ from traditional financial assets primarily because they:',
    answerChoices: [
      { label: 'A', text: 'Generate no income and have storage costs', isCorrect: true, explanation: 'Unlike stocks (dividends) or bonds (interest), physical commodities generate no income. They also incur storage, insurance, and transportation costs (cost of carry).' },
      { label: 'B', text: 'Always appreciate in value over time', isCorrect: false, explanation: 'Commodity prices are cyclical and can decline significantly. There is no guaranteed appreciation.' },
      { label: 'C', text: 'Cannot be traded on exchanges', isCorrect: false, explanation: 'Many commodities trade on organized exchanges (CME, ICE) via futures and options contracts.' },
    ],
    difficulty: 'Easy',
    subject: 'Alternative Investments',
    reading: 'Introduction to Alternative Investments',
    topic: 'Commodities',
    provider: 'schweser',
    questionSourceFile: null,
  },

  // Portfolio Management additional
  {
    id: 'pm-4',
    questionText: 'The Sharpe ratio measures:',
    answerChoices: [
      { label: 'A', text: 'Excess return per unit of total risk', isCorrect: true, explanation: 'Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation. It measures reward-to-total-risk, useful for evaluating well-diversified portfolios.' },
      { label: 'B', text: 'Excess return per unit of systematic risk', isCorrect: false, explanation: 'This describes the Treynor ratio, which uses beta (systematic risk) in the denominator instead of standard deviation.' },
      { label: 'C', text: 'The alpha generated relative to the benchmark', isCorrect: false, explanation: 'This describes Jensen\'s alpha, not the Sharpe ratio.' },
    ],
    difficulty: 'Easy',
    subject: 'Portfolio Management',
    reading: 'Portfolio Risk and Return: Part I',
    topic: 'Risk-Adjusted Performance',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'pm-5',
    questionText: 'According to the Investment Policy Statement (IPS), the two main categories of constraints are:',
    answerChoices: [
      { label: 'A', text: 'Liquidity, time horizon, taxes, legal/regulatory, and unique circumstances', isCorrect: true, explanation: 'The IPS includes return objectives and risk tolerance as objectives, plus five constraints: Liquidity needs, Time horizon, Tax considerations, Legal/regulatory factors, and Unique circumstances.' },
      { label: 'B', text: 'Market risk and credit risk', isCorrect: false, explanation: 'These are types of investment risk, not IPS constraint categories.' },
      { label: 'C', text: 'Active management and passive management', isCorrect: false, explanation: 'These are investment approaches/strategies, not IPS constraints.' },
    ],
    difficulty: 'Medium',
    subject: 'Portfolio Management',
    reading: 'Basics of Portfolio Planning and Construction',
    topic: 'Investment Policy Statement',
    provider: 'curriculum',
    questionSourceFile: null,
  },
];
