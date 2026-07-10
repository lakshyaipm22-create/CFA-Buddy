import { describe, it, expect } from 'vitest';
import { parseSolutions } from '../import-questions';

describe('parseSolutions', () => {
  it('handles "X is correct. Explanation" format', () => {
    const text = `
SOLUTIONS

1. C is correct. The yield curve inverts when short-term rates exceed long-term rates.
2. A is correct. Duration measures interest rate sensitivity.
3. B is correct. Convexity adjusts the duration estimate for large yield changes.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(3);
    expect(solutions[0].num).toBe(1);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[0].explanation).toContain('yield curve inverts');
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].correctLetter).toBe('B');
  });

  it('handles "X. Explanation" format (letter + period + space)', () => {
    const text = `
SOLUTIONS

1. C. The yield curve inverts when short-term rates exceed long-term rates.
2. A. Duration measures interest rate sensitivity.
3. B. Convexity adjusts the duration estimate for large yield changes.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(3);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[0].explanation).toContain('yield curve inverts');
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].correctLetter).toBe('B');
  });

  it('handles "X Explanation" format (letter + space + text)', () => {
    const text = `
SOLUTIONS

1. C The yield curve inverts when short-term rates exceed long-term rates.
2. A Duration measures interest rate sensitivity.
3. B Convexity adjusts the duration estimate for large yield changes.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(3);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[0].explanation).toContain('yield curve inverts');
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].correctLetter).toBe('B');
  });

  it('handles "X\\nExplanation" format (letter alone then newline)', () => {
    const text = `
SOLUTIONS

1. C
The yield curve inverts when short-term rates exceed long-term rates.
2. A
Duration measures interest rate sensitivity.
3. B
Convexity adjusts the duration estimate for large yield changes.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(3);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[0].explanation).toContain('yield curve inverts');
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].correctLetter).toBe('B');
  });

  it('handles mixed formats in the same solutions section', () => {
    const text = `
SOLUTIONS

1. C is correct. Standard explanation for question 1.
2. A. Period format for question 2.
3. B Space format for question 3.
4. D
Newline format for question 4.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(4);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].correctLetter).toBe('B');
    expect(solutions[3].correctLetter).toBe('D');
  });

  it('handles multi-digit question numbers', () => {
    const text = `
10. C is correct. First double-digit question.
11. A. Period format at number 11.
12. B Space format at number 12.
132. D
Newline format at number 132.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(4);
    expect(solutions[0].num).toBe(10);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[1].num).toBe(11);
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].num).toBe(12);
    expect(solutions[2].correctLetter).toBe('B');
    expect(solutions[3].num).toBe(132);
    expect(solutions[3].correctLetter).toBe('D');
  });

  it('handles multiline explanation within a block', () => {
    const text = `
1. C The yield curve inverts when short-term rates exceed
long-term rates. This is important in fixed income analysis
because it signals potential recession.
2. A Duration is a key risk measure.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(2);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[0].explanation).toContain('yield curve inverts');
    expect(solutions[0].explanation).toContain('signals potential recession');
    expect(solutions[1].correctLetter).toBe('A');
  });

  it('returns empty array for text with no parseable solutions', () => {
    const text = `
SOLUTIONS

This section contains only narrative text without any numbered answers.
No structured content here.
`;
    const solutions = parseSolutions(text);
    expect(solutions.length).toBe(0);
  });

  it('preserves existing "X is correct" format without regression', () => {
    // Simulating the format that already works for Quantitative Methods and Economics
    const text = `
1. C is correct. The population mean is the average of all values in the population.
2. A is correct. A z-statistic is used when the population variance is known.
3. B is correct. The central limit theorem states that for large samples, the sampling distribution approaches normal.
4. D is correct. A Type II error occurs when we fail to reject a false null hypothesis.
5. C is correct. The p-value represents the smallest significance level at which the null hypothesis would be rejected.
`;
    const solutions = parseSolutions(text);

    expect(solutions.length).toBe(5);
    expect(solutions[0].correctLetter).toBe('C');
    expect(solutions[1].correctLetter).toBe('A');
    expect(solutions[2].correctLetter).toBe('B');
    expect(solutions[3].correctLetter).toBe('D');
    expect(solutions[4].correctLetter).toBe('C');
    // Verify explanations are captured
    expect(solutions[0].explanation).toContain('population mean');
    expect(solutions[4].explanation).toContain('p-value');
  });
});
