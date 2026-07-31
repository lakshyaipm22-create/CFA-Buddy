import { describe, it, expect } from 'vitest';
import {
  buildProgressTimeline,
  computeTrendLine,
  predictScoreAtDate,
  computeImprovementVelocity,
} from '../utils/progress-timeline';
import type { PracticeAttempt } from '../types/attempt';

function createAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'a-1',
    subjectName: 'Corporate Issuers',
    attemptNumber: 1,
    completedAt: '2025-01-10T10:00:00Z',
    moduleResults: [],
    overallScore: 7,
    overallTotal: 10,
    overallPercentage: 70,
    avgTimePerQuestion: 45,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
    ...overrides,
  };
}

describe('buildProgressTimeline', () => {
  it('should return empty array for no attempts', () => {
    const result = buildProgressTimeline([]);
    expect(result).toHaveLength(0);
  });

  it('should sort attempts chronologically', () => {
    const attempts: PracticeAttempt[] = [
      createAttempt({ id: 'a-2', completedAt: '2025-02-01T10:00:00Z', overallPercentage: 80 }),
      createAttempt({ id: 'a-1', completedAt: '2025-01-10T10:00:00Z', overallPercentage: 60 }),
      createAttempt({ id: 'a-3', completedAt: '2025-03-01T10:00:00Z', overallPercentage: 90 }),
    ];

    const result = buildProgressTimeline(attempts);

    expect(result).toHaveLength(3);
    expect(result[0].attemptId).toBe('a-1');
    expect(result[1].attemptId).toBe('a-2');
    expect(result[2].attemptId).toBe('a-3');
  });

  it('should include correct fields in each entry', () => {
    const attempts: PracticeAttempt[] = [
      createAttempt({ id: 'a-1', subjectName: 'Economics', overallScore: 8, overallPercentage: 80 }),
    ];

    const result = buildProgressTimeline(attempts);

    expect(result[0]).toEqual({
      date: '2025-01-10T10:00:00Z',
      score: 8,
      percentage: 80,
      attemptId: 'a-1',
      subjectName: 'Economics',
    });
  });
});

describe('computeTrendLine', () => {
  it('should return zero slope for single data point', () => {
    const data = [{ date: '2025-01-01T00:00:00Z', percentage: 70 }];
    const result = computeTrendLine(data);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(70);
    expect(result.r2).toBe(0);
  });

  it('should return zero for empty data', () => {
    const result = computeTrendLine([]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(0);
    expect(result.r2).toBe(0);
  });

  it('should compute positive slope for improving scores', () => {
    const data = [
      { date: '2025-01-01T00:00:00Z', percentage: 50 },
      { date: '2025-01-08T00:00:00Z', percentage: 60 },
      { date: '2025-01-15T00:00:00Z', percentage: 70 },
      { date: '2025-01-22T00:00:00Z', percentage: 80 },
    ];

    const result = computeTrendLine(data);

    // Perfectly linear data: 10% per 7 days = ~1.43% per day
    expect(result.slope).toBeCloseTo(10 / 7, 1);
    expect(result.intercept).toBeCloseTo(50, 1);
    expect(result.r2).toBeCloseTo(1, 3);
  });

  it('should compute negative slope for declining scores', () => {
    const data = [
      { date: '2025-01-01T00:00:00Z', percentage: 80 },
      { date: '2025-01-08T00:00:00Z', percentage: 70 },
      { date: '2025-01-15T00:00:00Z', percentage: 60 },
    ];

    const result = computeTrendLine(data);

    expect(result.slope).toBeLessThan(0);
    expect(result.r2).toBeCloseTo(1, 3);
  });

  it('should handle noisy data with reasonable R2', () => {
    const data = [
      { date: '2025-01-01T00:00:00Z', percentage: 50 },
      { date: '2025-01-08T00:00:00Z', percentage: 65 },
      { date: '2025-01-15T00:00:00Z', percentage: 55 },
      { date: '2025-01-22T00:00:00Z', percentage: 72 },
      { date: '2025-01-29T00:00:00Z', percentage: 68 },
    ];

    const result = computeTrendLine(data);

    // Overall trend is upward despite noise
    expect(result.slope).toBeGreaterThan(0);
    // R2 should be less than 1 due to noise
    expect(result.r2).toBeLessThan(1);
    expect(result.r2).toBeGreaterThan(0);
  });
});

describe('predictScoreAtDate', () => {
  it('should return 0 for empty timeline', () => {
    const result = predictScoreAtDate([], '2025-06-01');
    expect(result).toBe(0);
  });

  it('should predict higher score in the future for improving trend', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 50 },
      { date: '2025-01-08T00:00:00Z', percentage: 60 },
      { date: '2025-01-15T00:00:00Z', percentage: 70 },
    ];

    const predicted = predictScoreAtDate(timeline, '2025-02-01T00:00:00Z');

    // Should extrapolate beyond 70% since trend is upward
    expect(predicted).toBeGreaterThan(70);
  });

  it('should clamp predictions between 0 and 100', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 90 },
      { date: '2025-01-08T00:00:00Z', percentage: 95 },
      { date: '2025-01-15T00:00:00Z', percentage: 98 },
    ];

    // Very far in the future would extrapolate past 100
    const predicted = predictScoreAtDate(timeline, '2026-12-01T00:00:00Z');
    expect(predicted).toBeLessThanOrEqual(100);
  });

  it('should predict lower score for declining trend', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 80 },
      { date: '2025-01-08T00:00:00Z', percentage: 70 },
      { date: '2025-01-15T00:00:00Z', percentage: 60 },
    ];

    const predicted = predictScoreAtDate(timeline, '2025-02-01T00:00:00Z');
    expect(predicted).toBeLessThan(60);
  });
});

describe('computeImprovementVelocity', () => {
  it('should return 0 for fewer than 2 entries', () => {
    expect(computeImprovementVelocity([])).toBe(0);
    expect(computeImprovementVelocity([{ date: '2025-01-01', percentage: 50 }])).toBe(0);
  });

  it('should compute positive velocity for improving scores', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 50 },
      { date: '2025-01-15T00:00:00Z', percentage: 70 },
    ];

    const velocity = computeImprovementVelocity(timeline);

    // 20% over 2 weeks = 10% per week
    expect(velocity).toBe(10);
  });

  it('should compute negative velocity for declining scores', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 80 },
      { date: '2025-01-08T00:00:00Z', percentage: 70 },
    ];

    const velocity = computeImprovementVelocity(timeline);

    // -10% over 1 week = -10% per week
    expect(velocity).toBe(-10);
  });

  it('should return 0 when dates are identical', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 50 },
      { date: '2025-01-01T00:00:00Z', percentage: 70 },
    ];

    const velocity = computeImprovementVelocity(timeline);
    expect(velocity).toBe(0);
  });

  it('should compute velocity based on first and last entries', () => {
    const timeline = [
      { date: '2025-01-01T00:00:00Z', percentage: 50 },
      { date: '2025-01-08T00:00:00Z', percentage: 40 }, // dip in the middle
      { date: '2025-01-15T00:00:00Z', percentage: 60 },
      { date: '2025-01-22T00:00:00Z', percentage: 80 },
    ];

    const velocity = computeImprovementVelocity(timeline);

    // 30% over 3 weeks = 10% per week
    expect(velocity).toBe(10);
  });
});
