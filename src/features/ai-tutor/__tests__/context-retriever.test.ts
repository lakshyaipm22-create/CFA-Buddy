import { describe, expect, it } from 'vitest';
import {
  buildContext,
  findRelevantFormulas,
  findRelevantQuestions,
} from '../utils/context-retriever';

describe('context-retriever', () => {
  describe('findRelevantFormulas', () => {
    it('finds relevant formulas by topic keyword', () => {
      const results = findRelevantFormulas('time value of money');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((f) => f.topic.includes('Time Value of Money'))).toBe(true);
    });

    it('finds formulas by name keyword', () => {
      const results = findRelevantFormulas('standard deviation');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((f) => f.name.includes('Standard Deviation'))).toBe(true);
    });

    it('finds formulas by subject keyword', () => {
      const results = findRelevantFormulas('economics elasticity');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((f) => f.subject === 'Economics')).toBe(true);
    });

    it('returns empty when no matches', () => {
      const results = findRelevantFormulas('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('returns empty for empty query', () => {
      const results = findRelevantFormulas('');
      expect(results).toEqual([]);
    });

    it('limits results to top-5', () => {
      // "rate" should match many formulas
      const results = findRelevantFormulas('interest rate value');
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('ranks by relevance - name matches score higher', () => {
      const results = findRelevantFormulas('future value');
      expect(results.length).toBeGreaterThan(0);
      // The first result should have "Future Value" in its name
      expect(results[0].name.toLowerCase()).toContain('future value');
    });

    it('includes relevance scores', () => {
      const results = findRelevantFormulas('present value');
      for (const r of results) {
        expect(r.relevanceScore).toBeGreaterThan(0);
      }
    });

    it('results are sorted by descending relevance score', () => {
      const results = findRelevantFormulas('rate return');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore
        );
      }
    });
  });

  describe('findRelevantQuestions', () => {
    it('finds relevant questions by topic', () => {
      const results = findRelevantQuestions('ethics');
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(
          (q) =>
            q.subject.toLowerCase().includes('ethic') ||
            (q.topic ?? '').toLowerCase().includes('ethic')
        )
      ).toBe(true);
    });

    it('finds relevant questions by subject keyword', () => {
      const results = findRelevantQuestions('fixed income');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((q) => q.subject.toLowerCase().includes('fixed income'))).toBe(
        true
      );
    });

    it('returns empty when no matches', () => {
      const results = findRelevantQuestions('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('limits results to top-5', () => {
      const results = findRelevantQuestions('financial analysis investment');
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('ranks by relevance', () => {
      const results = findRelevantQuestions('ethics professional standards');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore
        );
      }
    });
  });

  describe('buildContext', () => {
    it('returns both formulas and questions', () => {
      const context = buildContext('time value of money present value');
      expect(context.formulas).toBeDefined();
      expect(context.questions).toBeDefined();
    });

    it('returns formulas when formula-specific query', () => {
      const context = buildContext('standard deviation coefficient of variation');
      expect(context.formulas.length).toBeGreaterThan(0);
    });

    it('returns empty results for garbage query', () => {
      const context = buildContext('xyzabc123nonexistent');
      expect(context.formulas).toEqual([]);
      expect(context.questions).toEqual([]);
    });
  });
});
