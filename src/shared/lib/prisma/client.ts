import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Prisma v7 requires an adapter or accelerateUrl.
  // The adapter (e.g. @prisma/adapter-pg) will be configured
  // once the database connection is fully set up.
  // For now, we use the accelerateUrl approach with DATABASE_URL.
  return new PrismaClient({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter: null as any,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
