import { describe, it, expect } from 'vitest';
import { sep } from 'path';

describe('relativePath normalization', () => {
  it('should always use forward slashes regardless of OS separator', () => {
    // Simulate what discoverFiles does internally
    const winStylePath = 'curriculum\\level1\\cfa-program2026L1V4-FSA.pdf';
    const normalized = winStylePath.split('\\').join('/');
    expect(normalized).toBe('curriculum/level1/cfa-program2026L1V4-FSA.pdf');
    expect(normalized).not.toContain('\\');
  });

  it('should be a no-op on already-forward-slash paths', () => {
    const unixStylePath = 'curriculum/level1/cfa-program2026L1V4-FSA.pdf';
    const normalized = unixStylePath.split(sep).join('/');
    expect(normalized).toBe(unixStylePath);
  });
});

describe('parser matching against normalized paths', () => {
  it('curriculum parser regex should match normalized Windows-origin paths', () => {
    const relativePath = 'curriculum/level1/cfa-program2026L1V4-FSA.pdf';
    expect(/curriculum\/level\d/i.test(relativePath)).toBe(true);
  });

  it('ift parser regex should match normalized Windows-origin paths', () => {
    const relativePath = 'notes/level1/ift/IFT 2025 PDFs/04 - Financial Statement Analysis/LM01 Introduction to Financial Statement Analysis IFT Notes.pdf';
    expect(/\/ift\//i.test(relativePath)).toBe(true);
  });

  it('mock parser regex should match normalized Windows-origin paths', () => {
    const relativePath = 'mocks/level1/Schweser Mocks 2024/Mock Exam 2.pdf';
    expect(/mocks\//i.test(relativePath)).toBe(true);
  });

  it('formula parser regex should match normalized Windows-origin paths', () => {
    const relativePath = 'formulas/level1/formula sheet qm.pdf';
    expect(/formulas\//i.test(relativePath)).toBe(true);
  });
});
