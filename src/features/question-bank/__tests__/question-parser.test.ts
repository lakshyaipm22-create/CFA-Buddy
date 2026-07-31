import { describe, it, expect } from 'vitest';
import { parseAnswers, parseQuestions, mergeQuestionsAndAnswers } from '../utils/question-parser';

describe('parseAnswers', () => {
  it('handles "X is correct. Explanation" format', () => {
    const text = `
1. C is correct. The yield curve inverts when short-term rates exceed long-term rates.
2. A is correct. Duration measures interest rate sensitivity.
3. B is correct. Convexity adjusts the duration estimate for large yield changes.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(3);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(1)?.explanation).toContain('yield curve inverts');
    expect(answers.get(2)?.correctAnswer).toBe('A');
    expect(answers.get(3)?.correctAnswer).toBe('B');
  });

  it('handles "X. Explanation" format (letter + period + space)', () => {
    const text = `
1. C. The yield curve inverts when short-term rates exceed long-term rates.
2. A. Duration measures interest rate sensitivity.
3. B. Convexity adjusts the duration estimate for large yield changes.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(3);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(1)?.explanation).toContain('yield curve inverts');
    expect(answers.get(2)?.correctAnswer).toBe('A');
    expect(answers.get(3)?.correctAnswer).toBe('B');
  });

  it('handles "X Explanation" format (letter + space + text)', () => {
    const text = `
1. C The yield curve inverts when short-term rates exceed long-term rates.
2. A Duration measures interest rate sensitivity.
3. B Convexity adjusts the duration estimate for large yield changes.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(3);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(1)?.explanation).toContain('yield curve inverts');
    expect(answers.get(2)?.correctAnswer).toBe('A');
    expect(answers.get(3)?.correctAnswer).toBe('B');
  });

  it('handles "X\\nExplanation" format (letter alone then newline)', () => {
    const text = `
1. C
The yield curve inverts when short-term rates exceed long-term rates.
2. A
Duration measures interest rate sensitivity.
3. B
Convexity adjusts the duration estimate for large yield changes.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(3);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(1)?.explanation).toContain('yield curve inverts');
    expect(answers.get(2)?.correctAnswer).toBe('A');
    expect(answers.get(3)?.correctAnswer).toBe('B');
  });

  it('handles mixed formats in the same text', () => {
    const text = `
1. C is correct. Standard format with explanation.
2. A. Period format explanation here.
3. B Space format explanation here.
4. D
Newline format explanation here.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(4);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(2)?.correctAnswer).toBe('A');
    expect(answers.get(3)?.correctAnswer).toBe('B');
    expect(answers.get(4)?.correctAnswer).toBe('D');
  });

  it('handles "Correct Answer: X" format', () => {
    const text = `
1. Correct Answer: B
The explanation follows here.
2. Correct answer A
Another explanation.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(2);
    expect(answers.get(1)?.correctAnswer).toBe('B');
    expect(answers.get(2)?.correctAnswer).toBe('A');
  });

  it('handles multi-digit question numbers', () => {
    const text = `
10. C is correct. First question in double digits.
11. A. Period format at number 11.
12. B Space format at number 12.
132. D
Newline format at number 132.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(4);
    expect(answers.get(10)?.correctAnswer).toBe('C');
    expect(answers.get(11)?.correctAnswer).toBe('A');
    expect(answers.get(12)?.correctAnswer).toBe('B');
    expect(answers.get(132)?.correctAnswer).toBe('D');
  });

  it('handles extra whitespace around letter', () => {
    const text = `
1.  C is correct. Extra space before letter.
2.  A. Extra space period format.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(2);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(2)?.correctAnswer).toBe('A');
  });

  it('returns empty map for text with no parseable answers', () => {
    const text = `
Some random text that does not contain any answer patterns.
Just paragraphs of explanation without structure.
`;
    const answers = parseAnswers(text);
    expect(answers.size).toBe(0);
  });

  it('handles multiline explanation within a single answer block', () => {
    const text = `
1. C The yield curve inverts when short-term rates exceed
long-term rates. This is a key concept in fixed income.
2. A Duration measures interest rate sensitivity of bond prices.
`;
    const answers = parseAnswers(text);

    expect(answers.size).toBe(2);
    expect(answers.get(1)?.correctAnswer).toBe('C');
    expect(answers.get(1)?.explanation).toContain('yield curve inverts');
    expect(answers.get(1)?.explanation).toContain('key concept');
  });
});

describe('parseQuestions', () => {
  it('parses questions with standard A. B. C. format', () => {
    const text = `
1. What is the primary purpose of duration in fixed income analysis?
A. Measuring credit risk
B. Measuring interest rate sensitivity
C. Measuring liquidity risk

2. Which of the following best describes convexity?
A. A linear approximation of price changes
B. A curvature adjustment to duration
C. A measure of default probability
`;
    const questions = parseQuestions(text);

    expect(questions.length).toBe(2);
    expect(questions[0].questionNumber).toBe(1);
    expect(questions[0].text).toContain('primary purpose of duration');
    expect(questions[0].choices.length).toBe(3);
    expect(questions[0].choices[0].label).toBe('A');
    expect(questions[1].questionNumber).toBe(2);
  });
});

describe('mergeQuestionsAndAnswers', () => {
  it('merges parsed questions with their answers', () => {
    const text = `
1. What is the primary purpose of duration in fixed income analysis?
A. Measuring credit risk
B. Measuring interest rate sensitivity
C. Measuring liquidity risk
`;
    const questions = parseQuestions(text);

    const answersText = `
1. B is correct. Duration measures the sensitivity of a bond's price to changes in interest rates.
`;
    const answers = parseAnswers(answersText);
    const merged = mergeQuestionsAndAnswers(questions, answers);

    expect(merged[0].correctAnswer).toBe('B');
    expect(merged[0].explanation).toContain('sensitivity');
  });
});
