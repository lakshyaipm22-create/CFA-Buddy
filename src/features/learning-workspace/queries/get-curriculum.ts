import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ContentMetadata } from '@/features/content-scanner/types';

export interface SubjectInfo {
  name: string;
  abbreviation: string;
  resourceCount: number;
  providers: string[];
  readings: string[];
}

export interface ReadingInfo {
  name: string;
  readingNumber: number | null;
  resources: ContentMetadata[];
  providers: string[];
}

/**
 * Get all subjects for a given level, derived from the content index.
 */
export async function getCurriculumSubjects(level: number = 1): Promise<SubjectInfo[]> {
  const resources = await loadActiveResources(level);
  
  const subjectMap = new Map<string, { resources: ContentMetadata[]; providers: Set<string>; readings: Set<string> }>();

  for (const r of resources) {
    const subject = r.subject ?? 'Uncategorized';
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { resources: [], providers: new Set(), readings: new Set() });
    }
    const entry = subjectMap.get(subject)!;
    entry.resources.push(r);
    if (r.provider) entry.providers.add(r.provider);
    if (r.reading) entry.readings.add(r.reading);
  }

  return [...subjectMap.entries()]
    .map(([name, data]) => ({
      name,
      abbreviation: getAbbreviation(name),
      resourceCount: data.resources.length,
      providers: [...data.providers],
      readings: [...data.readings].sort(),
    }))
    .sort((a, b) => getSubjectOrder(a.name) - getSubjectOrder(b.name));
}

/**
 * Get all readings for a subject, grouped from content index.
 */
export async function getSubjectReadings(subject: string, level: number = 1): Promise<ReadingInfo[]> {
  const resources = await loadActiveResources(level);
  const subjectResources = resources.filter(r => r.subject === subject);

  const readingMap = new Map<string, { number: number | null; resources: ContentMetadata[]; providers: Set<string> }>();

  for (const r of subjectResources) {
    const readingKey = r.reading ?? r.fileName;
    if (!readingMap.has(readingKey)) {
      readingMap.set(readingKey, { number: r.readingNumber, resources: [], providers: new Set() });
    }
    const entry = readingMap.get(readingKey)!;
    entry.resources.push(r);
    if (r.provider) entry.providers.add(r.provider);
    if (r.readingNumber && !entry.number) entry.number = r.readingNumber;
  }

  return [...readingMap.entries()]
    .map(([name, data]) => ({
      name,
      readingNumber: data.number,
      resources: data.resources,
      providers: [...data.providers],
    }))
    .sort((a, b) => (a.readingNumber ?? 999) - (b.readingNumber ?? 999));
}

/**
 * Get resources for a specific reading within a subject
 */
export async function getReadingResources(subject: string, reading: string, level: number = 1): Promise<ContentMetadata[]> {
  const resources = await loadActiveResources(level);
  return resources.filter(r => r.subject === subject && r.reading === reading);
}

async function loadActiveResources(level: number): Promise<ContentMetadata[]> {
  const indexPath = join(process.cwd(), 'content', 'metadata', 'content-index.json');
  if (!existsSync(indexPath)) return [];

  const data = await readFile(indexPath, 'utf-8');
  const parsed = JSON.parse(data);
  const resources: ContentMetadata[] = parsed.resources ?? [];

  return resources.filter(r => r.level === level && r.status === 'active' && r.isLatest);
}

function getAbbreviation(subject: string): string {
  const map: Record<string, string> = {
    'Quantitative Methods': 'QM',
    'Economics': 'Eco',
    'Corporate Issuers': 'CI',
    'Financial Statement Analysis': 'FSA',
    'Equity Investments': 'Equity',
    'Fixed Income': 'FI',
    'Derivatives': 'Deriv',
    'Alternative Investments': 'AI',
    'Portfolio Management': 'PM',
    'Ethical and Professional Standards': 'Ethics',
  };
  return map[subject] ?? subject.slice(0, 3);
}

function getSubjectOrder(subject: string): number {
  const order = ['Quantitative Methods', 'Economics', 'Corporate Issuers', 'Financial Statement Analysis', 'Equity Investments', 'Fixed Income', 'Derivatives', 'Alternative Investments', 'Portfolio Management', 'Ethical and Professional Standards'];
  const idx = order.indexOf(subject);
  return idx >= 0 ? idx : 99;
}
