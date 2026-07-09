import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: null as any,
});

async function main() {
  console.log('🌱 Seeding database...');

  // Delete existing seed data first (idempotent - safe to re-run)
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

  console.log('✅ Seed complete!');
  console.log(`   - ${levels.length} Levels`);
  console.log(`   - ${subjects.length} Subjects (Level I)`);
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
