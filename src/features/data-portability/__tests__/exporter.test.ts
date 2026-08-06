import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gatherExportData, getDataCounts } from '../utils/exporter';
import { STORAGE_KEY_MAP } from '../utils/storage-keys';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock } });

describe('exporter', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('gatherExportData', () => {
    it('returns export data with metadata when localStorage has data', () => {
      localStorageMock.setItem('cfa-buddy-notes', JSON.stringify([{ id: '1', text: 'test' }]));
      localStorageMock.setItem('cfa-buddy-streak', JSON.stringify({ days: 5 }));

      const result = gatherExportData();

      expect(result).not.toBeNull();
      expect(result!.metadata).toBeDefined();
      expect(result!.metadata.appVersion).toBe('0.1.0');
      expect(result!.metadata.dataVersion).toBe(1);
      expect(result!.metadata.exportDate).toBeDefined();
      expect(result!.notes).toEqual([{ id: '1', text: 'test' }]);
      expect(result!.streak).toEqual({ days: 5 });
    });

    it('includes all storage keys in the export', () => {
      const result = gatherExportData();

      expect(result).not.toBeNull();
      for (const field of Object.keys(STORAGE_KEY_MAP)) {
        expect(result!).toHaveProperty(field);
      }
    });

    it('sets null for missing localStorage entries', () => {
      const result = gatherExportData();

      expect(result).not.toBeNull();
      expect(result!.notes).toBeNull();
      expect(result!.attempts).toBeNull();
    });

    it('exports array data correctly', () => {
      const attempts = [
        { id: '1', topic: 'Ethics', score: 0.8 },
        { id: '2', topic: 'Quant', score: 0.7 },
      ];
      localStorageMock.setItem('cfa-buddy-attempts', JSON.stringify(attempts));

      const result = gatherExportData();

      expect(result!.attempts).toEqual(attempts);
    });

    it('exports object data correctly', () => {
      const gamification = { xp: 1500, level: 5, badges: [] };
      localStorageMock.setItem('cfa-buddy-gamification', JSON.stringify(gamification));

      const result = gatherExportData();

      expect(result!.gamification).toEqual(gamification);
    });
  });

  describe('getDataCounts', () => {
    it('returns 0 for empty localStorage', () => {
      const counts = getDataCounts();

      for (const field of Object.keys(STORAGE_KEY_MAP)) {
        expect(counts[field]).toBe(0);
      }
    });

    it('returns array length for array data', () => {
      localStorageMock.setItem(
        'cfa-buddy-attempts',
        JSON.stringify([{ id: '1' }, { id: '2' }, { id: '3' }])
      );

      const counts = getDataCounts();

      expect(counts.attempts).toBe(3);
    });

    it('returns object key count for object data', () => {
      localStorageMock.setItem(
        'cfa-buddy-gamification',
        JSON.stringify({ xp: 100, level: 2, badges: [] })
      );

      const counts = getDataCounts();

      expect(counts.gamification).toBe(3);
    });

    it('returns 1 for primitive values', () => {
      localStorageMock.setItem('cfa-buddy-exam-target', JSON.stringify('2025-12-01'));

      const counts = getDataCounts();

      expect(counts.examTarget).toBe(1);
    });
  });
});
