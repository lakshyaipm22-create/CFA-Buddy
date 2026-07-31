import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ContentMetadata } from '@/features/content-scanner/types';
import { sortByCfaOrder } from '@/shared/config/subjects';

export interface ResourceFilters {
  level?: number;
  subject?: string;
  provider?: string;
  resourceType?: string;
}

export interface GroupedResources {
  bySubject: Record<string, ContentMetadata[]>;
  byProvider: Record<string, ContentMetadata[]>;
  byType: Record<string, ContentMetadata[]>;
}

/**
 * Load all resources from the content-index.json
 * This runs server-side in RSC or API routes.
 */
export async function getResources(filters?: ResourceFilters): Promise<ContentMetadata[]> {
  const indexPath = join(process.cwd(), 'content', 'metadata', 'content-index.json');
  
  if (!existsSync(indexPath)) {
    return [];
  }

  const data = await readFile(indexPath, 'utf-8');
  const parsed = JSON.parse(data);
  let resources: ContentMetadata[] = parsed.resources ?? [];

  // Apply filters
  if (filters?.level) {
    resources = resources.filter(r => r.level === filters.level);
  }
  if (filters?.subject) {
    resources = resources.filter(r => r.subject === filters.subject);
  }
  if (filters?.provider) {
    resources = resources.filter(r => r.provider === filters.provider);
  }
  if (filters?.resourceType) {
    resources = resources.filter(r => r.resourceType === filters.resourceType);
  }

  // Only show latest versions and active files
  resources = resources.filter(r => r.status === 'active' && r.isLatest);

  return resources;
}

/**
 * Get unique subjects from the index
 */
export async function getSubjects(level?: number): Promise<string[]> {
  const resources = await getResources(level ? { level } : undefined);
  const subjects = new Set(resources.map(r => r.subject).filter(Boolean) as string[]);
  return sortByCfaOrder([...subjects]);
}

/**
 * Get unique providers from the index
 */
export async function getProviders(): Promise<string[]> {
  const resources = await getResources();
  const providers = new Set(resources.map(r => r.provider).filter(Boolean) as string[]);
  return [...providers].sort();
}

/**
 * Group resources by subject for the browse view
 */
export async function getResourcesGrouped(filters?: ResourceFilters): Promise<GroupedResources> {
  const resources = await getResources(filters);
  
  const bySubject: Record<string, ContentMetadata[]> = {};
  const byProvider: Record<string, ContentMetadata[]> = {};
  const byType: Record<string, ContentMetadata[]> = {};

  for (const r of resources) {
    const subject = r.subject ?? 'Uncategorized';
    const provider = r.provider ?? 'Unknown';
    const type = r.resourceType;

    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push(r);

    if (!byProvider[provider]) byProvider[provider] = [];
    byProvider[provider].push(r);

    if (!byType[type]) byType[type] = [];
    byType[type].push(r);
  }

  return { bySubject, byProvider, byType };
}

/**
 * Get a single resource by its ID
 */
export async function getResourceById(id: string): Promise<ContentMetadata | null> {
  const indexPath = join(process.cwd(), 'content', 'metadata', 'content-index.json');
  
  if (!existsSync(indexPath)) return null;

  const data = await readFile(indexPath, 'utf-8');
  const parsed = JSON.parse(data);
  const resources: ContentMetadata[] = parsed.resources ?? [];

  return resources.find(r => r.id === id) ?? null;
}
