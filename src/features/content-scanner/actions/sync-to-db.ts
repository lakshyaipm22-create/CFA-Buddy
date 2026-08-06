'use server';

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ActionResult } from '@/shared/types/action-result';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';
import type { ContentMetadata } from '../types';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const syncOptionsSchema = z.object({
  contentDir: z.string().optional(),
  dryRun: z.boolean().optional(),
}).optional();

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncResult {
  totalResources: number;
  upserted: number;
  skipped: number;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapContentTypeFromMetadata(resourceType: string): string {
  switch (resourceType) {
    case 'curriculum':
    case 'schweser-notes':
    case 'ift-notes':
    case 'mark-meldrum-notes':
    case 'fintree-notes':
    case 'question-bank':
    case 'mock-exam':
    case 'formula-sheet':
    case 'personal-note':
    case 'solution':
    case 'answer-key':
      return 'PDF';
    case 'video':
      return 'VideoLink';
    default:
      return 'Unknown';
  }
}

function mapProviderSlug(provider: string | null): string | null {
  if (!provider) return null;
  // Map scanner provider names to normalized slug format
  const mapping: Record<string, string> = {
    curriculum: 'curriculum',
    schweser: 'schweser',
    ift: 'ift',
    'mark-meldrum': 'mark-meldrum',
    fintree: 'fintree',
    uworld: 'uworld',
    '25th-hour': '25th-hour',
    personal: 'personal',
  };
  return mapping[provider] ?? provider;
}

// ─── Action ──────────────────────────────────────────────────────────────────

/**
 * Sync content-index.json to the database.
 * Reads the generated content index and upserts ContentResource records.
 * Only runs when a database is available.
 */
export async function syncContentToDb(
  options?: z.infer<typeof syncOptionsSchema>
): Promise<ActionResult<SyncResult>> {
  const validated = syncOptionsSchema.safeParse(options);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid options.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const opts = validated.data ?? {};
  const contentDir = opts.contentDir ?? join(process.cwd(), 'content');
  const dryRun = opts.dryRun ?? false;
  const indexPath = join(contentDir, 'metadata', 'content-index.json');

  // Check if content-index.json exists
  if (!existsSync(indexPath)) {
    return {
      success: false,
      error: `Content index not found at ${indexPath}. Run "npm run scan:content" first.`,
    };
  }

  // Read and parse the content index
  let resources: ContentMetadata[];
  try {
    const raw = await readFile(indexPath, 'utf-8');
    resources = JSON.parse(raw) as ContentMetadata[];
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse error';
    return { success: false, error: `Failed to read content index: ${message}` };
  }

  if (!Array.isArray(resources) || resources.length === 0) {
    return {
      success: true,
      data: { totalResources: 0, upserted: 0, skipped: 0, errors: [] },
    };
  }

  // If no DB, return the parsed data info without upserting
  if (!isDatabaseAvailable()) {
    return {
      success: true,
      data: {
        totalResources: resources.length,
        upserted: 0,
        skipped: resources.length,
        errors: ['Database not available. Resources parsed but not synced.'],
      },
    };
  }

  if (dryRun) {
    return {
      success: true,
      data: {
        totalResources: resources.length,
        upserted: 0,
        skipped: 0,
        errors: ['Dry run: no records written.'],
      },
    };
  }

  // DB is available, perform upsert
  const { prisma } = await import('@/shared/lib/prisma/client');
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Build a provider slug-to-id cache
  const providerCache = new Map<string, string>();

  for (const resource of resources) {
    try {
      // Only sync active resources
      if (resource.status !== 'active') {
        skipped++;
        continue;
      }

      // Resolve provider
      let providerId: string | null = null;
      const providerSlug = mapProviderSlug(resource.provider);
      if (providerSlug) {
        if (providerCache.has(providerSlug)) {
          providerId = providerCache.get(providerSlug)!;
        } else {
          const provider = await prisma.contentProvider.findUnique({
            where: { slug: providerSlug },
          });
          if (provider) {
            providerCache.set(providerSlug, provider.id);
            providerId = provider.id;
          }
        }
      }

      // Upsert content resource
      await prisma.contentResource.upsert({
        where: { id: resource.id },
        update: {
          filePath: resource.relativePath,
          contentType: mapContentTypeFromMetadata(resource.resourceType) as 'PDF' | 'VideoLink' | 'FormulaSheet' | 'Unknown',
          fileSizeBytes: BigInt(resource.fileSize),
          active: resource.status === 'active',
          providerId,
          pairedResourceId: resource.pairedWith,
        },
        create: {
          id: resource.id,
          filePath: resource.relativePath,
          contentType: mapContentTypeFromMetadata(resource.resourceType) as 'PDF' | 'VideoLink' | 'FormulaSheet' | 'Unknown',
          fileSizeBytes: BigInt(resource.fileSize),
          active: resource.status === 'active',
          providerId,
          pairedResourceId: resource.pairedWith,
          discoveredAt: new Date(resource.discoveredAt),
        },
      });
      upserted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to upsert ${resource.relativePath}: ${message}`);
      skipped++;
    }
  }

  return {
    success: true,
    data: {
      totalResources: resources.length,
      upserted,
      skipped,
      errors,
    },
  };
}
