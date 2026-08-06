import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateImportData, generateImportPreview, importData } from '../utils/importer';

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

const validExportJson = JSON.stringify({
  metadata: {
    exportDate: '2025-01-15T10:00:00.000Z',
    appVersion: '0.1.0',
    dataVersion: 1,
  },
  notes: [{ id: '1', text: 'Study ethics' }],
  attempts: [{ id: 'a1', topic: 'Ethics', score: 0.85 }],
  sessions: [],
  flashcards: [{ id: 'f1', front: 'Q1', back: 'A1' }],
  progress: { Ethics: { completed: 5, total: 10 } },
  streak: { days: 7 },
});

describe('importer', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('validateImportData', () => {
    it('validates correct export data', () => {
      const result = validateImportData(validExportJson);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.appVersion).toBe('0.1.0');
        expect(result.data.notes).toEqual([{ id: '1', text: 'Study ethics' }]);
      }
    });

    it('rejects invalid JSON', () => {
      const result = validateImportData('not json at all{');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('Invalid JSON');
      }
    });

    it('rejects non-object JSON', () => {
      const result = validateImportData('"just a string"');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('Expected a JSON object');
      }
    });

    it('rejects data without metadata', () => {
      const noMetadata = JSON.stringify({
        notes: [],
        attempts: [],
      });

      const result = validateImportData(noMetadata);

      expect(result.success).toBe(false);
    });

    it('accepts data with only metadata and some sections', () => {
      const minimal = JSON.stringify({
        metadata: {
          exportDate: '2025-01-15T10:00:00.000Z',
          appVersion: '0.1.0',
          dataVersion: 1,
        },
        notes: [{ id: '1', text: 'hello' }],
      });

      const result = validateImportData(minimal);

      expect(result.success).toBe(true);
    });

    it('handles missing optional fields gracefully', () => {
      const partial = JSON.stringify({
        metadata: {
          exportDate: '2025-01-15T10:00:00.000Z',
          appVersion: '0.1.0',
          dataVersion: 1,
        },
      });

      const result = validateImportData(partial);

      expect(result.success).toBe(true);
    });
  });

  describe('generateImportPreview', () => {
    it('shows correct item counts for arrays', () => {
      const validation = validateImportData(validExportJson);
      if (!validation.success) throw new Error('Validation should pass');

      const preview = generateImportPreview(validation.data);

      expect(preview.itemCounts.notes).toBe(1);
      expect(preview.itemCounts.attempts).toBe(1);
      expect(preview.itemCounts.sessions).toBe(0);
      expect(preview.itemCounts.flashcards).toBe(1);
      expect(preview.exportDate).toBe('2025-01-15T10:00:00.000Z');
      expect(preview.appVersion).toBe('0.1.0');
    });

    it('shows correct counts for object data', () => {
      const validation = validateImportData(validExportJson);
      if (!validation.success) throw new Error('Validation should pass');

      const preview = generateImportPreview(validation.data);

      expect(preview.itemCounts.progress).toBe(1); // one key: Ethics
    });

    it('shows 0 for missing sections', () => {
      const minimal = JSON.stringify({
        metadata: {
          exportDate: '2025-01-15T10:00:00.000Z',
          appVersion: '0.1.0',
          dataVersion: 1,
        },
      });
      const validation = validateImportData(minimal);
      if (!validation.success) throw new Error('Validation should pass');

      const preview = generateImportPreview(validation.data);

      expect(preview.itemCounts.notes).toBe(0);
      expect(preview.itemCounts.attempts).toBe(0);
    });
  });

  describe('importData', () => {
    it('imports valid data into localStorage', () => {
      const validation = validateImportData(validExportJson);
      if (!validation.success) throw new Error('Validation should pass');

      const result = importData(validation.data);

      expect(result.success).toBe(true);
      expect(result.itemsImported).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cfa-buddy-notes',
        JSON.stringify([{ id: '1', text: 'Study ethics' }])
      );
    });

    it('skips null/undefined sections', () => {
      const minimal = JSON.stringify({
        metadata: {
          exportDate: '2025-01-15T10:00:00.000Z',
          appVersion: '0.1.0',
          dataVersion: 1,
        },
        notes: [{ id: '1', text: 'hi' }],
      });
      const validation = validateImportData(minimal);
      if (!validation.success) throw new Error('Validation should pass');

      const result = importData(validation.data);

      expect(result.success).toBe(true);
      expect(result.itemsImported).toBe(1); // only notes
    });

    it('warns about newer data version', () => {
      const futureVersion = JSON.stringify({
        metadata: {
          exportDate: '2025-01-15T10:00:00.000Z',
          appVersion: '2.0.0',
          dataVersion: 99,
        },
        notes: [{ id: '1', text: 'future' }],
      });
      const validation = validateImportData(futureVersion);
      if (!validation.success) throw new Error('Validation should pass');

      const result = importData(validation.data);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('data version 99');
    });

    it('returns empty errors array on full success', () => {
      const validation = validateImportData(validExportJson);
      if (!validation.success) throw new Error('Validation should pass');

      const result = importData(validation.data);

      expect(result.errors).toEqual([]);
    });
  });
});
