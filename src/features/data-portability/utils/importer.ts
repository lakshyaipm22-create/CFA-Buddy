import { z } from 'zod';
import type { ImportResult, ImportPreview, ValidationError } from '../types';
import { STORAGE_KEY_MAP } from './storage-keys';

const CURRENT_DATA_VERSION = 1;

/**
 * Zod schema for validating import data.
 * All data sections are optional to allow partial imports.
 */
const ExportMetadataSchema = z.object({
  exportDate: z.string(),
  appVersion: z.string(),
  dataVersion: z.number(),
});

const ExportDataSchema = z.object({
  metadata: ExportMetadataSchema,
  notes: z.unknown().optional(),
  attempts: z.unknown().optional(),
  sessions: z.unknown().optional(),
  flashcards: z.unknown().optional(),
  progress: z.unknown().optional(),
  mistakes: z.unknown().optional(),
  bookmarks: z.unknown().optional(),
  examTarget: z.unknown().optional(),
  streak: z.unknown().optional(),
  gamification: z.unknown().optional(),
  mockExams: z.unknown().optional(),
  emailPrefs: z.unknown().optional(),
  groups: z.unknown().optional(),
  activityFeed: z.unknown().optional(),
  leaderboard: z.unknown().optional(),
  reviewSessions: z.unknown().optional(),
  reviewHistory: z.unknown().optional(),
  dailyStats: z.unknown().optional(),
  scheduledCards: z.unknown().optional(),
  localProfile: z.unknown().optional(),
});

export type ValidatedExportData = z.infer<typeof ExportDataSchema>;

/**
 * Parses and validates a JSON string as export data.
 * Returns the parsed data or an array of validation errors.
 */
export function validateImportData(
  jsonString: string
): { success: true; data: ValidatedExportData } | { success: false; errors: ValidationError[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      errors: [{ field: 'file', message: 'Invalid JSON file. The file could not be parsed.' }],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      success: false,
      errors: [{ field: 'file', message: 'Invalid format. Expected a JSON object.' }],
    };
  }

  const result = ExportDataSchema.safeParse(parsed);
  if (!result.success) {
    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
    }));
    return { success: false, errors };
  }

  // Additional validation: metadata must exist
  if (!result.data.metadata) {
    return {
      success: false,
      errors: [{ field: 'metadata', message: 'Missing required field: metadata' }],
    };
  }

  return { success: true, data: result.data };
}

/**
 * Generates a preview of what will be imported, including item counts per category.
 */
export function generateImportPreview(data: ValidatedExportData): ImportPreview {
  const itemCounts: Record<string, number> = {};

  for (const field of Object.keys(STORAGE_KEY_MAP)) {
    const value = (data as Record<string, unknown>)[field];
    if (value === null || value === undefined) {
      itemCounts[field] = 0;
    } else if (Array.isArray(value)) {
      itemCounts[field] = value.length;
    } else if (typeof value === 'object') {
      itemCounts[field] = Object.keys(value as object).length;
    } else {
      itemCounts[field] = 1;
    }
  }

  return {
    itemCounts,
    exportDate: data.metadata.exportDate,
    appVersion: data.metadata.appVersion,
    dataVersion: data.metadata.dataVersion,
  };
}

/**
 * Imports validated data into localStorage.
 * Returns an ImportResult with success status, item count, and any warnings.
 */
export function importData(data: ValidatedExportData): ImportResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      itemsImported: 0,
      errors: [{ field: 'environment', message: 'Cannot import data in server environment.' }],
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const errors: ValidationError[] = [];
  let itemsImported = 0;

  // Check data version compatibility
  if (data.metadata.dataVersion > CURRENT_DATA_VERSION) {
    warnings.push(
      `Export uses data version ${data.metadata.dataVersion}, but this app supports version ${CURRENT_DATA_VERSION}. Some data may not import correctly.`
    );
  }

  for (const [field, storageKey] of Object.entries(STORAGE_KEY_MAP)) {
    const value = (data as Record<string, unknown>)[field];
    if (value === null || value === undefined) {
      continue; // Skip null/missing sections
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(storageKey, serialized);
      itemsImported++;
    } catch (err) {
      errors.push({
        field,
        message: `Failed to import ${field}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }

  return {
    success: errors.length === 0,
    itemsImported,
    errors,
    warnings,
  };
}
