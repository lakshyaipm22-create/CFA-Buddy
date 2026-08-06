import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: null as any,
});

async function main() {
  console.log('🌱 Seeding database...');

  // Delete existing seed data first (idempotent - safe to re-run)
  await prisma.topic.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.level.deleteMany();
  await prisma.contentProvider.deleteMany();

  // Create Levels
  const levels = await Promise.all([
    prisma.level.create({
      data: { name: 'I', sortOrder: 1 },
    }),
    prisma.level.create({
      data: { name: 'II', sortOrder: 2 },
    }),
    prisma.level.create({
      data: { name: 'III', sortOrder: 3 },
    }),
  ]);

  const levelI = levels[0];

  // Create Level I Subjects with CFA 2026 curriculum weightings (midpoint of range)
  const subjectsData = [
    { name: 'Quantitative Methods', abbreviation: 'QM', sortOrder: 1, weight: 0.075 },
    { name: 'Economics', abbreviation: 'Eco', sortOrder: 2, weight: 0.075 },
    { name: 'Corporate Issuers', abbreviation: 'CI', sortOrder: 3, weight: 0.075 },
    { name: 'Financial Statement Analysis', abbreviation: 'FSA', sortOrder: 4, weight: 0.125 },
    { name: 'Equity Investments', abbreviation: 'Equity', sortOrder: 5, weight: 0.125 },
    { name: 'Fixed Income', abbreviation: 'FI', sortOrder: 6, weight: 0.125 },
    { name: 'Derivatives', abbreviation: 'Deriv', sortOrder: 7, weight: 0.065 },
    { name: 'Alternative Investments', abbreviation: 'AI', sortOrder: 8, weight: 0.065 },
    { name: 'Portfolio Management', abbreviation: 'PM', sortOrder: 9, weight: 0.10 },
    { name: 'Ethical and Professional Standards', abbreviation: 'Ethics', sortOrder: 10, weight: 0.175 },
  ];

  const subjects = await Promise.all(
    subjectsData.map((data) =>
      prisma.subject.create({
        data: {
          levelId: levelI.id,
          name: data.name,
          abbreviation: data.abbreviation,
          sortOrder: data.sortOrder,
          weight: data.weight,
        },
      })
    )
  );

  // Create Content Providers
  const providersData = [
    { name: 'CFA Institute Curriculum 2026', slug: 'curriculum', description: 'Official CFA Program curriculum' },
    { name: 'Kaplan Schweser', slug: 'schweser', description: 'Kaplan Schweser study notes and materials' },
    { name: 'IFT (Irfanullah Financial Training)', slug: 'ift', description: 'IFT video notes and study materials' },
    { name: 'Mark Meldrum', slug: 'mark-meldrum', description: 'Mark Meldrum video notes' },
    { name: 'Fintree', slug: 'fintree', description: 'Fintree Juice Notes and summaries' },
    { name: 'UWorld', slug: 'uworld', description: 'UWorld question bank' },
    { name: '25th Hour', slug: '25th-hour', description: '25th Hour last-minute revision notes' },
    { name: 'Personal', slug: 'personal', description: 'User-created personal notes and materials' },
  ];

  const providers = await Promise.all(
    providersData.map((data) =>
      prisma.contentProvider.create({
        data,
      })
    )
  );

  // Create Readings and Topics for each Level I Subject
  // Each subject gets 2-3 readings, each reading gets 2-3 topics
  const readingsAndTopics: {
    subjectIndex: number;
    readings: {
      name: string;
      readingNumber: number;
      topics: { name: string; losCode: string }[];
    }[];
  }[] = [
    {
      // Quantitative Methods
      subjectIndex: 0,
      readings: [
        {
          name: 'Time Value of Money',
          readingNumber: 1,
          topics: [
            { name: 'Interest Rates and Present Value', losCode: 'QM-1-a' },
            { name: 'Future Value and Compounding', losCode: 'QM-1-b' },
            { name: 'Annuities, Perpetuities, and Uneven Cash Flows', losCode: 'QM-1-c' },
          ],
        },
        {
          name: 'Statistical Concepts and Market Returns',
          readingNumber: 2,
          topics: [
            { name: 'Descriptive Statistics', losCode: 'QM-2-a' },
            { name: 'Probability Distributions', losCode: 'QM-2-b' },
            { name: 'Sampling and Estimation', losCode: 'QM-2-c' },
          ],
        },
        {
          name: 'Hypothesis Testing and Linear Regression',
          readingNumber: 3,
          topics: [
            { name: 'Hypothesis Testing', losCode: 'QM-3-a' },
            { name: 'Simple Linear Regression', losCode: 'QM-3-b' },
          ],
        },
      ],
    },
    {
      // Economics
      subjectIndex: 1,
      readings: [
        {
          name: 'Demand and Supply Analysis',
          readingNumber: 1,
          topics: [
            { name: 'Demand and Supply Curves', losCode: 'Eco-1-a' },
            { name: 'Consumer and Producer Surplus', losCode: 'Eco-1-b' },
            { name: 'Market Equilibrium', losCode: 'Eco-1-c' },
          ],
        },
        {
          name: 'Aggregate Output, Prices, and Economic Growth',
          readingNumber: 2,
          topics: [
            { name: 'GDP and Economic Indicators', losCode: 'Eco-2-a' },
            { name: 'Business Cycles', losCode: 'Eco-2-b' },
          ],
        },
        {
          name: 'Monetary and Fiscal Policy',
          readingNumber: 3,
          topics: [
            { name: 'Central Banks and Monetary Policy', losCode: 'Eco-3-a' },
            { name: 'Fiscal Policy Tools', losCode: 'Eco-3-b' },
          ],
        },
      ],
    },
    {
      // Corporate Issuers
      subjectIndex: 2,
      readings: [
        {
          name: 'Corporate Governance and ESG',
          readingNumber: 1,
          topics: [
            { name: 'Corporate Governance Mechanisms', losCode: 'CI-1-a' },
            { name: 'Stakeholder Management', losCode: 'CI-1-b' },
          ],
        },
        {
          name: 'Capital Structure and Leverage',
          readingNumber: 2,
          topics: [
            { name: 'Modigliani-Miller Propositions', losCode: 'CI-2-a' },
            { name: 'Optimal Capital Structure', losCode: 'CI-2-b' },
            { name: 'Leverage and Risk', losCode: 'CI-2-c' },
          ],
        },
        {
          name: 'Capital Budgeting',
          readingNumber: 3,
          topics: [
            { name: 'NPV and IRR', losCode: 'CI-3-a' },
            { name: 'Project Analysis and Evaluation', losCode: 'CI-3-b' },
          ],
        },
      ],
    },
    {
      // Financial Statement Analysis
      subjectIndex: 3,
      readings: [
        {
          name: 'Financial Reporting Standards',
          readingNumber: 1,
          topics: [
            { name: 'IFRS and US GAAP Framework', losCode: 'FSA-1-a' },
            { name: 'Financial Reporting Quality', losCode: 'FSA-1-b' },
          ],
        },
        {
          name: 'Income Statements and Balance Sheets',
          readingNumber: 2,
          topics: [
            { name: 'Revenue Recognition', losCode: 'FSA-2-a' },
            { name: 'Balance Sheet Components', losCode: 'FSA-2-b' },
            { name: 'Financial Ratios', losCode: 'FSA-2-c' },
          ],
        },
        {
          name: 'Cash Flow Statements',
          readingNumber: 3,
          topics: [
            { name: 'Operating Cash Flows', losCode: 'FSA-3-a' },
            { name: 'Free Cash Flow Analysis', losCode: 'FSA-3-b' },
          ],
        },
      ],
    },
    {
      // Equity Investments
      subjectIndex: 4,
      readings: [
        {
          name: 'Market Organization and Structure',
          readingNumber: 1,
          topics: [
            { name: 'Market Types and Trading', losCode: 'Equity-1-a' },
            { name: 'Security Market Indexes', losCode: 'Equity-1-b' },
          ],
        },
        {
          name: 'Equity Valuation: Concepts and Tools',
          readingNumber: 2,
          topics: [
            { name: 'Dividend Discount Models', losCode: 'Equity-2-a' },
            { name: 'Price Multiples', losCode: 'Equity-2-b' },
            { name: 'Enterprise Value', losCode: 'Equity-2-c' },
          ],
        },
      ],
    },
    {
      // Fixed Income
      subjectIndex: 5,
      readings: [
        {
          name: 'Fixed-Income Securities: Defining Elements',
          readingNumber: 1,
          topics: [
            { name: 'Bond Features and Types', losCode: 'FI-1-a' },
            { name: 'Bond Indentures and Covenants', losCode: 'FI-1-b' },
          ],
        },
        {
          name: 'Fixed-Income Valuation',
          readingNumber: 2,
          topics: [
            { name: 'Bond Pricing and YTM', losCode: 'FI-2-a' },
            { name: 'Spot Rates and Forward Rates', losCode: 'FI-2-b' },
            { name: 'Yield Spread Analysis', losCode: 'FI-2-c' },
          ],
        },
        {
          name: 'Fixed-Income Risk and Return',
          readingNumber: 3,
          topics: [
            { name: 'Duration and Convexity', losCode: 'FI-3-a' },
            { name: 'Interest Rate Risk', losCode: 'FI-3-b' },
          ],
        },
      ],
    },
    {
      // Derivatives
      subjectIndex: 6,
      readings: [
        {
          name: 'Derivative Markets and Instruments',
          readingNumber: 1,
          topics: [
            { name: 'Forward and Futures Contracts', losCode: 'Deriv-1-a' },
            { name: 'Options Contracts', losCode: 'Deriv-1-b' },
            { name: 'Swap Contracts', losCode: 'Deriv-1-c' },
          ],
        },
        {
          name: 'Pricing and Valuation of Derivatives',
          readingNumber: 2,
          topics: [
            { name: 'No-Arbitrage Pricing', losCode: 'Deriv-2-a' },
            { name: 'Put-Call Parity', losCode: 'Deriv-2-b' },
          ],
        },
      ],
    },
    {
      // Alternative Investments
      subjectIndex: 7,
      readings: [
        {
          name: 'Alternative Investment Features',
          readingNumber: 1,
          topics: [
            { name: 'Categories of Alternative Investments', losCode: 'AI-1-a' },
            { name: 'Due Diligence and Risk', losCode: 'AI-1-b' },
          ],
        },
        {
          name: 'Real Estate and Private Equity',
          readingNumber: 2,
          topics: [
            { name: 'Real Estate Valuation', losCode: 'AI-2-a' },
            { name: 'Private Equity Strategies', losCode: 'AI-2-b' },
            { name: 'Hedge Fund Strategies', losCode: 'AI-2-c' },
          ],
        },
      ],
    },
    {
      // Portfolio Management
      subjectIndex: 8,
      readings: [
        {
          name: 'Portfolio Risk and Return',
          readingNumber: 1,
          topics: [
            { name: 'Modern Portfolio Theory', losCode: 'PM-1-a' },
            { name: 'Capital Asset Pricing Model', losCode: 'PM-1-b' },
            { name: 'Efficient Frontier', losCode: 'PM-1-c' },
          ],
        },
        {
          name: 'Portfolio Planning and Construction',
          readingNumber: 2,
          topics: [
            { name: 'Investment Policy Statement', losCode: 'PM-2-a' },
            { name: 'Asset Allocation', losCode: 'PM-2-b' },
          ],
        },
      ],
    },
    {
      // Ethical and Professional Standards
      subjectIndex: 9,
      readings: [
        {
          name: 'Code of Ethics and Standards of Professional Conduct',
          readingNumber: 1,
          topics: [
            { name: 'Professionalism Standards (I)', losCode: 'Ethics-1-a' },
            { name: 'Integrity of Capital Markets (II)', losCode: 'Ethics-1-b' },
            { name: 'Duties to Clients (III)', losCode: 'Ethics-1-c' },
          ],
        },
        {
          name: 'Guidance for Standards I-VII',
          readingNumber: 2,
          topics: [
            { name: 'Duties to Employers (IV)', losCode: 'Ethics-2-a' },
            { name: 'Investment Analysis and Recommendations (V)', losCode: 'Ethics-2-b' },
            { name: 'Conflicts of Interest (VI)', losCode: 'Ethics-2-c' },
          ],
        },
        {
          name: 'Global Investment Performance Standards (GIPS)',
          readingNumber: 3,
          topics: [
            { name: 'GIPS Objectives and Scope', losCode: 'Ethics-3-a' },
            { name: 'GIPS Compliance and Verification', losCode: 'Ethics-3-b' },
          ],
        },
      ],
    },
  ];

  // Create all readings and topics
  let totalReadings = 0;
  let totalTopics = 0;

  for (const entry of readingsAndTopics) {
    const subject = subjects[entry.subjectIndex];
    for (let rIdx = 0; rIdx < entry.readings.length; rIdx++) {
      const readingData = entry.readings[rIdx];
      const reading = await prisma.reading.create({
        data: {
          subjectId: subject.id,
          name: readingData.name,
          readingNumber: readingData.readingNumber,
          sortOrder: rIdx + 1,
        },
      });
      totalReadings++;

      for (let tIdx = 0; tIdx < readingData.topics.length; tIdx++) {
        const topicData = readingData.topics[tIdx];
        await prisma.topic.create({
          data: {
            readingId: reading.id,
            name: topicData.name,
            losCode: topicData.losCode,
            sortOrder: tIdx + 1,
          },
        });
        totalTopics++;
      }
    }
  }

  console.log('✅ Seed complete!');
  console.log(`   - ${levels.length} Levels`);
  console.log(`   - ${subjects.length} Subjects (Level I)`);
  console.log(`   - ${totalReadings} Readings`);
  console.log(`   - ${totalTopics} Topics`);
  console.log(`   - ${providers.length} Content Providers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
