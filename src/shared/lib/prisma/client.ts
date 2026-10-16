/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prisma client singleton.
 * Typed as `any` to remain compatible with both the stub (dev, no DB)
 * and the real generated client (Vercel build, after `prisma generate`).
 * The real shape is enforced at call sites via Prisma's own method signatures.
 */
const { PrismaClient } = require('@/generated/prisma/client') as { PrismaClient: any };

const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma: any = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
