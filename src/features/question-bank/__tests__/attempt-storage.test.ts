import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAttempts, saveAttempt, getLatestAttempt, getAttemptById } from '../utils/attempt-storage';
import { seedCorporateIssuersAttempt } from '../utils/seed-corporate-issuers';
import { corporateIssuersQuestions } from '../data/corporate-issuers';
import type { PracticeAttempt } from '../types/attempt';

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

describe('attempt-storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getAttempts', () => {
    it('returns empty array when no data exists', () => {
      const result = getAttempts('Corporate Issuers');
      expect(result).toEqual([]);
    });

    it('returns only attempts matching the subject', () => {
      const attempt1: PracticeAttempt = {
        id: 'test-1',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-15T10:00:00Z',
        moduleResults: [],
        overallScore: 80,
        overallTotal: 100,
        overallPercentage: 80,
        avgTimePerQuestion: 60,
        bookmarkedIds: [],
        confidenceLevel: 'High',
      };
      const attempt2: PracticeAttempt = {
        id: 'test-2',
        subjectName: 'Fixed Income',
        attemptNumber: 1,
        completedAt: '2025-01-15T11:00:00Z',
        moduleResults: [],
        overallScore: 70,
        overallTotal: 100,
        overallPercentage: 70,
        avgTimePerQuestion: 55,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      };

      saveAttempt(attempt1);
      saveAttempt(attempt2);

      const result = getAttempts('Corporate Issuers');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-1');
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('cfa-buddy-attempts', 'invalid-json{{{');
      const result = getAttempts('Corporate Issuers');
      expect(result).toEqual([]);
    });
  });

  describe('saveAttempt', () => {
    it('saves a new attempt to localStorage', () => {
      const attempt: PracticeAttempt = {
        id: 'save-test',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-15T10:00:00Z',
        moduleResults: [],
        overallScore: 120,
        overallTotal: 158,
        overallPercentage: 76,
        avgTimePerQuestion: 75,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      };

      saveAttempt(attempt);

      const stored = JSON.parse(localStorageMock.getItem('cfa-buddy-attempts')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('save-test');
    });

    it('updates existing attempt with same id', () => {
      const attempt: PracticeAttempt = {
        id: 'update-test',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-15T10:00:00Z',
        moduleResults: [],
        overallScore: 100,
        overallTotal: 158,
        overallPercentage: 63,
        avgTimePerQuestion: 70,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      };

      saveAttempt(attempt);

      const updated = { ...attempt, overallScore: 120, overallPercentage: 76 };
      saveAttempt(updated);

      const stored = JSON.parse(localStorageMock.getItem('cfa-buddy-attempts')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].overallScore).toBe(120);
    });
  });

  describe('getLatestAttempt', () => {
    it('returns null when no attempts exist', () => {
      const result = getLatestAttempt('Corporate Issuers');
      expect(result).toBeNull();
    });

    it('returns the most recent attempt for the subject', () => {
      const older: PracticeAttempt = {
        id: 'older',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-10T10:00:00Z',
        moduleResults: [],
        overallScore: 100,
        overallTotal: 158,
        overallPercentage: 63,
        avgTimePerQuestion: 70,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      };
      const newer: PracticeAttempt = {
        id: 'newer',
        subjectName: 'Corporate Issuers',
        attemptNumber: 2,
        completedAt: '2025-01-15T10:00:00Z',
        moduleResults: [],
        overallScore: 120,
        overallTotal: 158,
        overallPercentage: 76,
        avgTimePerQuestion: 65,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      };

      saveAttempt(older);
      saveAttempt(newer);

      const result = getLatestAttempt('Corporate Issuers');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('newer');
    });
  });

  describe('getAttemptById', () => {
    it('returns null when attempt not found', () => {
      const result = getAttemptById('non-existent');
      expect(result).toBeNull();
    });

    it('returns the correct attempt by id', () => {
      const attempt: PracticeAttempt = {
        id: 'find-me',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-15T10:00:00Z',
        moduleResults: [],
        overallScore: 120,
        overallTotal: 158,
        overallPercentage: 76,
        avgTimePerQuestion: 75,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      };

      saveAttempt(attempt);

      const result = getAttemptById('find-me');
      expect(result).not.toBeNull();
      expect(result!.subjectName).toBe('Corporate Issuers');
    });
  });
});

describe('seedCorporateIssuersAttempt', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('creates an attempt with correct overall score of 120/158 (76%)', () => {
    const attempt = seedCorporateIssuersAttempt();

    expect(attempt.overallScore).toBe(120);
    expect(attempt.overallTotal).toBe(158);
    expect(attempt.overallPercentage).toBe(76);
    expect(attempt.subjectName).toBe('Corporate Issuers');
  });

  it('has correct per-module breakdown', () => {
    const attempt = seedCorporateIssuersAttempt();

    const expected = [
      { name: 'Organizational Forms', score: 13, total: 13 },
      { name: 'Investors and Other Stakeholders', score: 13, total: 14 },
      { name: 'Corporate Governance', score: 18, total: 23 },
      { name: 'Working Capital and Liquidity', score: 13, total: 18 },
      { name: 'Capital Investments and Capital Allocation', score: 19, total: 30 },
      { name: 'Capital Structure', score: 28, total: 43 },
      { name: 'Business Models', score: 16, total: 17 },
    ];

    expect(attempt.moduleResults).toHaveLength(7);
    attempt.moduleResults.forEach((mr, i) => {
      expect(mr.moduleName).toBe(expected[i].name);
      expect(mr.score).toBe(expected[i].score);
      expect(mr.total).toBe(expected[i].total);
    });
  });

  it('generates question attempts matching correct/incorrect counts per module', () => {
    const attempt = seedCorporateIssuersAttempt();

    attempt.moduleResults.forEach(mr => {
      const correctCount = mr.questionAttempts.filter(qa => qa.correct).length;
      expect(correctCount).toBe(mr.score);
      expect(mr.questionAttempts).toHaveLength(mr.total);
    });
  });

  it('does not create a duplicate if already seeded', () => {
    seedCorporateIssuersAttempt();
    seedCorporateIssuersAttempt();

    const attempts = getAttempts('Corporate Issuers');
    expect(attempts).toHaveLength(1);
  });

  it('sets confidence level to Medium for 76%', () => {
    const attempt = seedCorporateIssuersAttempt();
    expect(attempt.confidenceLevel).toBe('Medium');
  });

  it('sets reasonable avgTimePerQuestion values', () => {
    const attempt = seedCorporateIssuersAttempt();
    expect(attempt.avgTimePerQuestion).toBeGreaterThan(40);
    expect(attempt.avgTimePerQuestion).toBeLessThan(160);
  });
});

describe('corporateIssuersQuestions', () => {
  it('contains exactly 158 questions', () => {
    expect(corporateIssuersQuestions).toHaveLength(158);
  });

  it('all questions have 3 answer choices with A/B/C labels', () => {
    corporateIssuersQuestions.forEach(q => {
      expect(q.answerChoices).toHaveLength(3);
      expect(q.answerChoices.map(c => c.label)).toEqual(['A', 'B', 'C']);
    });
  });

  it('each question has exactly one correct answer', () => {
    corporateIssuersQuestions.forEach(q => {
      const correctCount = q.answerChoices.filter(c => c.isCorrect).length;
      expect(correctCount).toBe(1);
    });
  });

  it('all questions have subject "Corporate Issuers"', () => {
    corporateIssuersQuestions.forEach(q => {
      expect(q.subject).toBe('Corporate Issuers');
    });
  });

  it('all questions have provider "cfa-portal"', () => {
    corporateIssuersQuestions.forEach(q => {
      expect(q.provider).toBe('cfa-portal');
    });
  });

  it('all questions have unique IDs', () => {
    const ids = corporateIssuersQuestions.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(158);
  });

  it('has correct module distribution: 13+14+23+18+30+43+17 = 158', () => {
    const byTopic: Record<string, number> = {};
    corporateIssuersQuestions.forEach(q => {
      const topic = q.topic ?? 'unknown';
      byTopic[topic] = (byTopic[topic] ?? 0) + 1;
    });

    expect(byTopic['Organizational Forms']).toBe(13);
    expect(byTopic['Investors and Other Stakeholders']).toBe(14);
    expect(byTopic['Corporate Governance']).toBe(23);
    expect(byTopic['Working Capital and Liquidity']).toBe(18);
    expect(byTopic['Capital Investments and Capital Allocation']).toBe(30);
    expect(byTopic['Capital Structure']).toBe(43);
    expect(byTopic['Business Models']).toBe(17);
  });

  it('all answer choices have non-empty explanations', () => {
    corporateIssuersQuestions.forEach(q => {
      q.answerChoices.forEach(c => {
        expect(c.explanation.length).toBeGreaterThan(10);
      });
    });
  });
});
