import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTargets, setTarget, clearTarget, getExamDate, setExamDate } from '../utils/target-storage';
import { computeGapAnalysis } from '../components/gap-analysis';
import type { PracticeAttempt, ModuleResult } from '../types/attempt';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

function createModuleResult(overrides: Partial<ModuleResult> = {}): ModuleResult {
  return {
    moduleId: 'm-1',
    moduleName: 'Capital Structure',
    score: 7,
    total: 10,
    percentage: 70,
    avgTimePerQuestion: 45,
    questionAttempts: [],
    ...overrides,
  };
}

function createAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'a-1',
    subjectName: 'Corporate Issuers',
    attemptNumber: 1,
    completedAt: '2025-01-10T10:00:00Z',
    moduleResults: [
      createModuleResult({ moduleId: 'm-1', moduleName: 'Capital Structure', percentage: 70 }),
      createModuleResult({ moduleId: 'm-2', moduleName: 'Corporate Governance', percentage: 90 }),
      createModuleResult({ moduleId: 'm-3', moduleName: 'Cost of Capital', percentage: 55 }),
    ],
    overallScore: 7,
    overallTotal: 10,
    overallPercentage: 70,
    avgTimePerQuestion: 45,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
    ...overrides,
  };
}

describe('target-storage CRUD operations', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return empty object when no targets set', () => {
    const targets = getTargets();
    expect(targets).toEqual({});
  });

  it('should set and get a target', () => {
    setTarget('Capital Structure', 85);
    const targets = getTargets();
    expect(targets['Capital Structure']).toBe(85);
  });

  it('should clamp target to 50-100 range', () => {
    setTarget('Module A', 30);
    const targets = getTargets();
    expect(targets['Module A']).toBe(50);

    setTarget('Module B', 120);
    const targets2 = getTargets();
    expect(targets2['Module B']).toBe(100);
  });

  it('should update an existing target', () => {
    setTarget('Capital Structure', 80);
    setTarget('Capital Structure', 90);
    const targets = getTargets();
    expect(targets['Capital Structure']).toBe(90);
  });

  it('should clear a target', () => {
    setTarget('Capital Structure', 80);
    setTarget('Cost of Capital', 75);
    clearTarget('Capital Structure');
    const targets = getTargets();
    expect(targets['Capital Structure']).toBeUndefined();
    expect(targets['Cost of Capital']).toBe(75);
  });

  it('should handle clearing non-existent target gracefully', () => {
    clearTarget('Nonexistent');
    const targets = getTargets();
    expect(targets).toEqual({});
  });

  it('should get and set exam date', () => {
    expect(getExamDate()).toBeNull();
    setExamDate('2025-06-15');
    expect(getExamDate()).toBe('2025-06-15');
  });

  it('should overwrite exam date', () => {
    setExamDate('2025-06-01');
    setExamDate('2025-08-15');
    expect(getExamDate()).toBe('2025-08-15');
  });
});

describe('gap analysis priority sorting', () => {
  it('should return empty array for no attempts', () => {
    const result = computeGapAnalysis([], {});
    expect(result).toHaveLength(0);
  });

  it('should compute gaps correctly with default target of 80%', () => {
    const attempts = [createAttempt()];
    const result = computeGapAnalysis(attempts, {});

    // Capital Structure: 70% vs 80% target = 10% gap
    const capitalStructure = result.find(g => g.moduleName === 'Capital Structure');
    expect(capitalStructure).toBeDefined();
    expect(capitalStructure!.gap).toBe(10);
    expect(capitalStructure!.target).toBe(80);

    // Corporate Governance: 90% vs 80% target = -10% gap (ahead)
    const corpGov = result.find(g => g.moduleName === 'Corporate Governance');
    expect(corpGov).toBeDefined();
    expect(corpGov!.gap).toBe(-10);
  });

  it('should use custom targets when provided', () => {
    const attempts = [createAttempt()];
    const targets = { 'Capital Structure': 90, 'Cost of Capital': 60 };
    const result = computeGapAnalysis(attempts, targets);

    const capitalStructure = result.find(g => g.moduleName === 'Capital Structure');
    expect(capitalStructure!.gap).toBe(20); // 90 - 70

    const costOfCapital = result.find(g => g.moduleName === 'Cost of Capital');
    expect(costOfCapital!.gap).toBe(5); // 60 - 55
  });

  it('should sort by weighted priority (gap * curriculum weight)', () => {
    const attempts = [createAttempt()];
    const result = computeGapAnalysis(attempts, {});

    // Modules with positive gaps should be sorted by weightedPriority descending
    const positiveGaps = result.filter(g => g.gap > 0);
    for (let i = 0; i < positiveGaps.length - 1; i++) {
      expect(positiveGaps[i].weightedPriority).toBeGreaterThanOrEqual(positiveGaps[i + 1].weightedPriority);
    }
  });

  it('should use the latest attempt for gap analysis', () => {
    const attempts = [
      createAttempt({
        id: 'a-1',
        completedAt: '2025-01-01T10:00:00Z',
        moduleResults: [
          createModuleResult({ moduleName: 'Capital Structure', percentage: 50 }),
        ],
      }),
      createAttempt({
        id: 'a-2',
        completedAt: '2025-02-01T10:00:00Z',
        moduleResults: [
          createModuleResult({ moduleName: 'Capital Structure', percentage: 75 }),
        ],
      }),
    ];

    const result = computeGapAnalysis(attempts, {});
    const capitalStructure = result.find(g => g.moduleName === 'Capital Structure');
    // Should use latest attempt's score (75%), gap = 80 - 75 = 5
    expect(capitalStructure!.currentScore).toBe(75);
    expect(capitalStructure!.gap).toBe(5);
  });

  it('should estimate questions needed to close gap', () => {
    const attempts = [
      createAttempt({
        id: 'a-1',
        completedAt: '2025-01-01T10:00:00Z',
        overallPercentage: 50,
        overallTotal: 10,
        moduleResults: [
          createModuleResult({ moduleName: 'Capital Structure', percentage: 50 }),
        ],
      }),
      createAttempt({
        id: 'a-2',
        completedAt: '2025-02-01T10:00:00Z',
        overallPercentage: 70,
        overallTotal: 10,
        moduleResults: [
          createModuleResult({ moduleName: 'Capital Structure', percentage: 70 }),
        ],
      }),
    ];

    const result = computeGapAnalysis(attempts, { 'Capital Structure': 90 });
    const capitalStructure = result.find(g => g.moduleName === 'Capital Structure');
    // Gap = 20%, avg improvement per question = 20/20 = 1% per question
    // Questions needed = 20 / 1 = 20
    expect(capitalStructure!.estimatedQuestions).toBe(20);
  });

  it('should apply CFA curriculum weights', () => {
    const attempts = [createAttempt({ subjectName: 'Corporate Issuers' })];
    const result = computeGapAnalysis(attempts, {});

    // Corporate Issuers weight is 0.08
    const withGap = result.find(g => g.gap > 0);
    expect(withGap!.weight).toBe(0.08);
  });
});
