import type { ExportData } from '../types';
import { STORAGE_KEY_MAP } from './storage-keys';

const APP_VERSION = '0.1.0';
const DATA_VERSION = 1;

/**
 * Gathers all user data from localStorage into a single ExportData object.
 * Returns null if localStorage is not available.
 */
export function gatherExportData(): ExportData | null {
  if (typeof window === 'undefined') return null;

  const data: Record<string, unknown> = {};

  for (const [field, storageKey] of Object.entries(STORAGE_KEY_MAP)) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        data[field] = JSON.parse(raw);
      } else {
        data[field] = null;
      }
    } catch {
      // If JSON parse fails, store as raw string
      data[field] = localStorage.getItem(storageKey);
    }
  }

  return {
    metadata: {
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      dataVersion: DATA_VERSION,
    },
    ...data,
  } as ExportData;
}

/**
 * Returns a count of non-null items in each data section.
 */
export function getDataCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};

  const counts: Record<string, number> = {};

  for (const [field, storageKey] of Object.entries(STORAGE_KEY_MAP)) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          counts[field] = parsed.length;
        } else if (parsed && typeof parsed === 'object') {
          counts[field] = Object.keys(parsed).length;
        } else {
          counts[field] = 1;
        }
      } else {
        counts[field] = 0;
      }
    } catch {
      counts[field] = 0;
    }
  }

  return counts;
}
