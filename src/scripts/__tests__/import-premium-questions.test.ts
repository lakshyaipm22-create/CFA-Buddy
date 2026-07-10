import { describe, it, expect } from 'vitest';
import {
  splitBySubject,
  parsePremiumQuestions,
  parsePremiumAnswers,
  normalizeSubject,
} from '../import-premium-questions';

describe('normalizeSubject', () => {
  it('extracts subject from "Subject: Practice Pack" header', () => {
    expect(normalizeSubject('Fixed Income: Practice Pack')).toBe('Fixed Income');
    expect(normalizeSubject('Financial Statement Analysis: Practice Pack')).toBe('Financial Statement Analysis');
    expect(normalizeSubject('Equity Investments: Practice Pack')).toBe('Equity Investments');
  });

  it('handles "Ethics" shorthand', () => {
    expect(normalizeSubject('Ethics: Practice Pack')).toBe('Ethical and Professional Standards');
  });

  it('handles "Ethical and Professional Standards"', () => {
    expect(normalizeSubject('Ethical and Professional Standards: Practice Pack')).toBe('Ethical and Professional Standards');
  });

  it('handles answers header variant', () => {
    expect(normalizeSubject('Fixed Income: Practice Pack- Answers')).toBe('Fixed Income');
    expect(normalizeSubject('Fixed Income: Practice Pack - Answers')).toBe('Fixed Income');
  });

  it('handles all expected subjects', () => {
    expect(normalizeSubject('Alternative Investments: Practice Pack')).toBe('Alternative Investments');
    expect(normalizeSubject('Corporate Issuers: Practice Pack')).toBe('Corporate Issuers');
    expect(normalizeSubject('Derivatives: Practice Pack')).toBe('Derivatives');
    expect(normalizeSubject('Portfolio Management: Practice Pack')).toBe('Portfolio Management');
    expect(normalizeSubject('Quantitative Methods: Practice Pack')).toBe('Quantitative Methods');
    expect(normalizeSubject('Economics: Practice Pack')).toBe('Economics');
  });

  it('handles OCR-mangled partial keyword "Income" -> Fixed Income', () => {
    expect(normalizeSubject('Income: Practice Pack')).toBe('Fixed Income');
    expect(normalizeSubject('Income: Practice Pack- Answers')).toBe('Fixed Income');
  });

  it('handles OCR-mangled partial keyword "Management" -> Portfolio Management', () => {
    expect(normalizeSubject('Management: Practice Pack')).toBe('Portfolio Management');
    expect(normalizeSubject('Management: Practice Pack- Answers')).toBe('Portfolio Management');
  });

  it('handles OCR-mangled partial keyword "Quantitative" -> Quantitative Methods', () => {
    expect(normalizeSubject('Quantitative: Practice Pack')).toBe('Quantitative Methods');
  });

  it('handles OCR partial "Financial" -> Financial Statement Analysis', () => {
    expect(normalizeSubject('Financial: Practice Pack')).toBe('Financial Statement Analysis');
  });

  it('handles OCR partial "Statement" -> Financial Statement Analysis', () => {
    expect(normalizeSubject('Statement Analysis: Practice Pack')).toBe('Financial Statement Analysis');
  });

  it('handles OCR partial "Portfolio" -> Portfolio Management', () => {
    expect(normalizeSubject('Portfolio: Practice Pack')).toBe('Portfolio Management');
  });

  it('handles OCR partial "Derivative" -> Derivatives', () => {
    expect(normalizeSubject('Derivative: Practice Pack')).toBe('Derivatives');
  });

  it('handles OCR partial "Econom" -> Economics', () => {
    expect(normalizeSubject('Econom: Practice Pack')).toBe('Economics');
  });

  it('pairs OCR-mangled questions and answers to same normalized subject', () => {
    // Simulates the FSA & Fixed Income PDF issue: "Income" in one header
    // and "Fixed Income" in another should both normalize to "Fixed Income"
    expect(normalizeSubject('Income')).toBe('Fixed Income');
    expect(normalizeSubject('Fixed Income')).toBe('Fixed Income');

    // Simulates the Portfolio & Quants PDF issue: "Management" and "Portfolio Management"
    // should both normalize to "Portfolio Management"
    expect(normalizeSubject('Management')).toBe('Portfolio Management');
    expect(normalizeSubject('Portfolio Management')).toBe('Portfolio Management');
  });
});

describe('splitBySubject', () => {
  it('splits text with one subject into one section', () => {
    const text = `
Fixed Income: Practice Pack
Question 1 of 3
Question
What is a bond?
A.    A debt instrument
B.    An equity instrument
C.    A derivative

Fixed Income: Practice Pack- Answers
Answer 1 of 3
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity instruments represent ownership.
C.    Incorrect because derivatives derive value from underlying assets.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Fixed Income');
    expect(sections[0].questionsText).toContain('Question 1 of 3');
    expect(sections[0].answersText).toContain('Answer 1 of 3');
  });

  it('splits text with multiple subjects', () => {
    const text = `
Fixed Income: Practice Pack
Question 1 of 2
Question
What is a bond?
A.    A debt instrument
B.    An equity instrument
C.    A derivative

Derivatives: Practice Pack
Question 1 of 1
Question
What is an option?
A.    A right to buy or sell
B.    An obligation to buy or sell
C.    A type of bond

Fixed Income: Practice Pack- Answers
Answer 1 of 2
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity instruments represent ownership.
C.    Incorrect because derivatives derive value from underlying assets.

Derivatives: Practice Pack - Answers
Answer 1 of 1
Answer
Solution
A.    Correct. An option gives the holder the right.
B.    Incorrect because options grant rights not obligations.
C.    Incorrect because options are derivatives, not bonds.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(2);

    const fi = sections.find(s => s.subject === 'Fixed Income');
    const der = sections.find(s => s.subject === 'Derivatives');

    expect(fi).toBeDefined();
    expect(der).toBeDefined();
    expect(fi!.questionsText).toContain('What is a bond');
    expect(der!.questionsText).toContain('What is an option');
    expect(fi!.answersText).toContain('A bond is a debt instrument');
    expect(der!.answersText).toContain('option gives the holder');
  });

  it('returns empty array for text without subject headers', () => {
    const text = 'Some random text without any practice pack headers.';
    const sections = splitBySubject(text);
    expect(sections.length).toBe(0);
  });

  it('handles OCR line-broken headers where subject name spans multiple lines', () => {
    const text = `Some preamble text here.

Fixed
Income:
Practice
Pack
Question 1 of 1
Question
What is a bond yield?
A.    The coupon rate.
B.    The discount rate.
C.    The face value.

Fixed Income: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because coupon rate is fixed.
B.    Correct. Yield is the discount rate.
C.    Incorrect because that is current yield.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Fixed Income');
    expect(sections[0].questionsText).toContain('What is a bond yield');
    expect(sections[0].answersText).toContain('Yield is the discount rate');
  });

  it('handles OCR line-broken multi-word subject (Financial Statement Analysis)', () => {
    const text = `Some preamble text.

Financial
Statement
Analysis:
Practice
Pack
Question 1 of 1
Question
What does the income statement report?
A.    Assets and liabilities.
B.    Revenues and expenses.
C.    Cash flows from operations.

Financial Statement Analysis: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because that is the balance sheet.
B.    Correct. The income statement reports revenues and expenses.
C.    Incorrect because that is the cash flow statement.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Financial Statement Analysis');
    expect(sections[0].questionsText).toContain('income statement report');
    expect(sections[0].answersText).toContain('revenues and expenses');
  });

  it('handles OCR line-broken Quantitative Methods header', () => {
    const text = `Some preamble.

Quantitative
Methods:
Practice
Pack
Question 1 of 1
Question
What is a standard deviation?
A.    A measure of central tendency.
B.    A measure of dispersion.
C.    A measure of skewness.

Quantitative Methods: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because that is the mean.
B.    Correct. Standard deviation measures dispersion.
C.    Incorrect because skewness is different.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Quantitative Methods');
    expect(sections[0].questionsText).toContain('standard deviation');
    expect(sections[0].answersText).toContain('measures dispersion');
  });

  it('handles mixed line-broken and normal headers in same PDF (FSA + Fixed Income)', () => {
    const text = `Preamble text.

Fixed
Income:
Practice
Pack
Question 1 of 1
Question
What is a bond?
A.    A debt instrument.
B.    An equity instrument.
C.    A derivative.

Financial
Statement
Analysis:
Practice
Pack
Question 1 of 1
Question
What is depreciation?
A.    A cash outflow.
B.    Allocation of cost over useful life.
C.    A revenue item.

Fixed Income: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity is ownership.
C.    Incorrect because derivatives derive value.

Financial Statement Analysis: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because depreciation is non-cash.
B.    Correct. Depreciation allocates cost over useful life.
C.    Incorrect because it is an expense.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(2);

    const fi = sections.find(s => s.subject === 'Fixed Income');
    const fsa = sections.find(s => s.subject === 'Financial Statement Analysis');
    expect(fi).toBeDefined();
    expect(fsa).toBeDefined();
    expect(fi!.questionsText).toContain('What is a bond');
    expect(fi!.answersText).toContain('debt instrument');
    expect(fsa!.questionsText).toContain('depreciation');
    expect(fsa!.answersText).toContain('allocates cost over useful life');
  });

  it('handles "Practice\\nPack-\\nQuestion" edge case (not answers)', () => {
    const text = `Preamble.

Portfolio
Management:
Practice
Pack-
Question
Question 1 of 1
Question
What is diversification?
A.    Concentrating in one asset.
B.    Spreading risk across assets.
C.    Eliminating all risk.

Portfolio Management: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because concentration increases risk.
B.    Correct. Diversification spreads risk.
C.    Incorrect because risk cannot be fully eliminated.
`;
    const sections = splitBySubject(text);
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Portfolio Management');
    expect(sections[0].questionsText).toContain('diversification');
    expect(sections[0].answersText).toContain('Diversification spreads risk');
  });
});

describe('parsePremiumQuestions', () => {
  it('parses basic questions with A./B./C. choices', () => {
    const text = `
Question 1 of 3
Question
If an issuer is required to retire a specified portion of the bond's principal each year, the
bond most likely:
A.    is callable.
B.    is a step-up note.
C.    has a sinking fund provision.

Question 2 of 3
Question
A five-year semiannual bond has an annual percentage rate (APR) of 8%. Converted to a
quarterly periodicity, the APR is closest to:
A.    1.98%.
B.    3.92%.
C.    7.92%.
`;
    const questions = parsePremiumQuestions(text);
    expect(questions.length).toBe(2);

    expect(questions[0].num).toBe(1);
    expect(questions[0].text).toContain('retire a specified portion');
    expect(questions[0].choices.length).toBe(3);
    expect(questions[0].choices[0].label).toBe('A');
    expect(questions[0].choices[0].text).toContain('callable');
    expect(questions[0].choices[1].label).toBe('B');
    expect(questions[0].choices[2].label).toBe('C');
    expect(questions[0].choices[2].text).toContain('sinking fund');

    expect(questions[1].num).toBe(2);
    expect(questions[1].text).toContain('five-year semiannual bond');
    expect(questions[1].choices.length).toBe(3);
  });

  it('handles OCR quirk: A, instead of A.', () => {
    const text = `
Question 1 of 1
Question
Which of the following is most accurate?
A,    A comma-separated choice.
B.    A normal choice.
C.    Another normal choice.
`;
    const questions = parsePremiumQuestions(text);
    expect(questions.length).toBe(1);
    expect(questions[0].choices[0].label).toBe('A');
    expect(questions[0].choices[0].text).toContain('comma-separated');
  });

  it('handles OCR quirk: Cc. instead of C.', () => {
    const text = `
Question 1 of 1
Question
What is the correct answer here?
A.    First choice.
B.    Second choice.
Cc.   Third choice with OCR error.
`;
    const questions = parsePremiumQuestions(text);
    expect(questions.length).toBe(1);
    expect(questions[0].choices.length).toBe(3);
    expect(questions[0].choices[2].label).toBe('C');
    expect(questions[0].choices[2].text).toContain('Third choice');
  });

  it('handles OCR quirk: Cc, instead of C.', () => {
    const text = `
Question 1 of 1
Question
What about this question?
A.    Option A here.
B,    Option B with comma.
Cc,   Option C with double letter and comma.
`;
    const questions = parsePremiumQuestions(text);
    expect(questions.length).toBe(1);
    expect(questions[0].choices.length).toBe(3);
    expect(questions[0].choices[0].label).toBe('A');
    expect(questions[0].choices[1].label).toBe('B');
    expect(questions[0].choices[2].label).toBe('C');
  });

  it('handles question text with line breaks mid-sentence', () => {
    const text = `
Question 1 of 1
Question
The market value of a bond will be equal to its par value on its maturity date
provided that the issuer does not
default.
A.    True statement.
B.    False statement.
C.    Cannot be determined.
`;
    const questions = parsePremiumQuestions(text);
    expect(questions.length).toBe(1);
    expect(questions[0].text).toContain('market value of a bond');
    expect(questions[0].text).toContain('does not default');
    // Should be joined into single line
    expect(questions[0].text).not.toContain('\n');
  });

  it('returns empty array for empty text', () => {
    expect(parsePremiumQuestions('')).toEqual([]);
    expect(parsePremiumQuestions('   ')).toEqual([]);
  });

  it('skips questions without enough choices', () => {
    const text = `
Question 1 of 2
Question
This question has only one choice:
A.    Only one option.

Question 2 of 2
Question
This question is proper:
A.    First option.
B.    Second option.
C.    Third option.
`;
    const questions = parsePremiumQuestions(text);
    expect(questions.length).toBe(1);
    expect(questions[0].num).toBe(2);
  });
});

describe('parsePremiumAnswers', () => {
  it('parses basic answers and identifies correct answer by "Correct" keyword', () => {
    const text = `
Answer 1 of 3
Answer
Solution
A.    Incorrect because a bond that is currently callable may be retired by the issuer, but
      the issuer is not required to do so.
B.    Incorrect because a step-up note has a coupon rate that increases over time
      according to a predetermined schedule.
C.    Correct. A sinking fund provision requires retirement of a portion of the bond's
      principal every year, rather than retirement of the entire issue at maturity.

Answer 2 of 3
Answer
Solution
A.    Incorrect because the APR converted to a quarterly basis should be expressed in
      annual terms.
B.    Incorrect because the APR converted to a quarterly basis cannot be calculated by
      simply scaling.
C.    Correct because (1 + APR2/2)^2 = (1 + APR4/4)^4 for annual percentage rates.
`;
    const answers = parsePremiumAnswers(text);
    expect(answers.length).toBe(2);

    expect(answers[0].num).toBe(1);
    expect(answers[0].correctLabel).toBe('C');
    expect(answers[0].explanations.length).toBe(3);
    expect(answers[0].explanations[2].text).toContain('sinking fund provision');

    expect(answers[1].num).toBe(2);
    expect(answers[1].correctLabel).toBe('C');
  });

  it('identifies correct answer at position A', () => {
    const text = `
Answer 1 of 1
Answer
Solution
A.    Correct. This is the right answer with explanation.
B.    Incorrect because this is wrong.
C.    Incorrect because this is also wrong.
`;
    const answers = parsePremiumAnswers(text);
    expect(answers.length).toBe(1);
    expect(answers[0].correctLabel).toBe('A');
  });

  it('identifies correct answer with "Correct because" variant', () => {
    const text = `
Answer 1 of 1
Answer
Solution
A.    Incorrect because first option is wrong.
B.    Correct because this is the right reasoning.
C.    Incorrect because third option fails.
`;
    const answers = parsePremiumAnswers(text);
    expect(answers.length).toBe(1);
    expect(answers[0].correctLabel).toBe('B');
  });

  it('handles OCR quirks in answer choices (Cc. / A,)', () => {
    const text = `
Answer 1 of 1
Answer
Solution
A,    Incorrect because not the right one.
B.    Incorrect because also wrong.
Cc.   Correct. The right answer is here.
`;
    const answers = parsePremiumAnswers(text);
    expect(answers.length).toBe(1);
    expect(answers[0].correctLabel).toBe('C');
  });

  it('returns empty array when no correct answer found', () => {
    const text = `
Answer 1 of 1
Answer
Solution
A.    Incorrect because wrong.
B.    Incorrect because also wrong.
C.    Incorrect because all wrong.
`;
    const answers = parsePremiumAnswers(text);
    expect(answers.length).toBe(0);
  });

  it('returns empty array for empty text', () => {
    expect(parsePremiumAnswers('')).toEqual([]);
    expect(parsePremiumAnswers('   ')).toEqual([]);
  });

  it('handles multi-line explanations within a single choice', () => {
    const text = `
Answer 1 of 1
Answer
Solution
A.    Incorrect because the yield curve does not invert under
      normal conditions when short-term rates are below long-term rates.
B.    Correct. The duration of a zero-coupon bond equals its
      maturity because there are no intermediate cash flows.
C.    Incorrect because convexity alone does not determine
      the price change of a bond.
`;
    const answers = parsePremiumAnswers(text);
    expect(answers.length).toBe(1);
    expect(answers[0].correctLabel).toBe('B');
    expect(answers[0].explanations[1].text).toContain('duration of a zero-coupon bond');
  });
});

describe('end-to-end: splitBySubject + parse', () => {
  it('processes a full premium PDF text structure', () => {
    const fullText = `
Fixed Income: Practice Pack
Question 1 of 2
Question
If an issuer is required to retire a specified portion of the bond's principal each year, the
bond most likely:
A.    is callable.
B.    is a step-up note.
C.    has a sinking fund provision.

Question 2 of 2
Question
A five-year semiannual bond has an APR of 8%. Converted to quarterly, it is closest to:
A.    1.98%.
B.    3.92%.
C.    7.92%.

Fixed Income: Practice Pack- Answers
Answer 1 of 2
Answer
Solution
A.    Incorrect because a callable bond may be retired but is not required.
B.    Incorrect because a step-up note has increasing coupons.
C.    Correct. A sinking fund provision requires annual principal retirement.

Answer 2 of 2
Answer
Solution
A.    Incorrect because this is not expressed in annual terms.
B.    Incorrect because scaling does not work directly.
C.    Correct because the conversion formula gives this result.
`;
    const sections = splitBySubject(fullText);
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Fixed Income');

    const questions = parsePremiumQuestions(sections[0].questionsText);
    expect(questions.length).toBe(2);

    const answers = parsePremiumAnswers(sections[0].answersText);
    expect(answers.length).toBe(2);
    expect(answers[0].correctLabel).toBe('C');
    expect(answers[1].correctLabel).toBe('C');
  });

  it('processes multi-subject PDF text', () => {
    const fullText = `
Economics: Practice Pack
Question 1 of 1
Question
GDP measures the total value of:
A.    all goods produced.
B.    final goods and services produced.
C.    intermediate goods only.

Alternative Investments: Practice Pack
Question 1 of 1
Question
Hedge funds are typically structured as:
A.    limited partnerships.
B.    public corporations.
C.    government agencies.

Economics: Practice Pack - Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because GDP counts only final goods.
B.    Correct. GDP measures the total value of final goods and services.
C.    Incorrect because intermediate goods are excluded.

Alternative Investments: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Correct. Hedge funds are typically structured as limited partnerships.
B.    Incorrect because they are private vehicles.
C.    Incorrect because they are not government entities.
`;
    const sections = splitBySubject(fullText);
    expect(sections.length).toBe(2);

    const econ = sections.find(s => s.subject === 'Economics')!;
    const alt = sections.find(s => s.subject === 'Alternative Investments')!;

    const econQs = parsePremiumQuestions(econ.questionsText);
    const econAs = parsePremiumAnswers(econ.answersText);
    expect(econQs.length).toBe(1);
    expect(econAs.length).toBe(1);
    expect(econAs[0].correctLabel).toBe('B');

    const altQs = parsePremiumQuestions(alt.questionsText);
    const altAs = parsePremiumAnswers(alt.answersText);
    expect(altQs.length).toBe(1);
    expect(altAs.length).toBe(1);
    expect(altAs[0].correctLabel).toBe('A');
  });

  it('filters out questions with no matching answer', () => {
    const fullText = `
Fixed Income: Practice Pack
Question 1 of 3
Question
First question with an answer available:
A.    Option A.
B.    Option B.
C.    Option C.

Question 2 of 3
Question
Second question without an answer:
A.    Option A.
B.    Option B.
C.    Option C.

Question 3 of 3
Question
Third question with an answer available:
A.    Option A.
B.    Option B.
C.    Option C.

Fixed Income: Practice Pack- Answers
Answer 1 of 3
Answer
Solution
A.    Correct. First answer is A.
B.    Incorrect because wrong.
C.    Incorrect because wrong.

Answer 3 of 3
Answer
Solution
A.    Incorrect because wrong.
B.    Incorrect because wrong.
C.    Correct. Third answer is C.
`;
    const sections = splitBySubject(fullText);
    const questions = parsePremiumQuestions(sections[0].questionsText);
    const answers = parsePremiumAnswers(sections[0].answersText);

    // Answer 2 is missing from answers section
    expect(questions.length).toBe(3);
    expect(answers.length).toBe(2); // Only 1 and 3 have correct answers

    // Simulate buildPremiumQuestions behavior: match by num
    const answerMap = new Map(answers.map(a => [a.num, a]));
    const matched = questions.filter(q => answerMap.has(q.num));
    expect(matched.length).toBe(2);
    expect(matched[0].num).toBe(1);
    expect(matched[1].num).toBe(3);
  });

  it('merges OCR-mangled headers "Management" and "Portfolio Management" into same subject', () => {
    // This simulates the Portfolio & Quants PDF bug where OCR produces
    // "Management: Practice Pack" for questions but "Portfolio Management: Practice Pack- Answers" for answers
    const fullText = `
Management: Practice Pack
Question 1 of 1
Question
What is the primary goal of portfolio management?
A.    Maximizing returns only.
B.    Balancing risk and return.
C.    Minimizing all risk.

Portfolio Management: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because risk must also be considered.
B.    Correct. Portfolio management balances risk and return.
C.    Incorrect because some risk is acceptable for higher returns.
`;
    const sections = splitBySubject(fullText);
    // Both headers normalize to "Portfolio Management" so they merge
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Portfolio Management');
    expect(sections[0].questionsText).toContain('primary goal');
    expect(sections[0].answersText).toContain('balances risk and return');
  });

  it('splits OCR-mangled multi-subject PDF with "Income" and "Financial Statement" variants', () => {
    // Simulates the FSA & Fixed Income PDF bug
    const fullText = `
Income: Practice Pack
Question 1 of 1
Question
What is a bond yield?
A.    The coupon rate.
B.    The discount rate that equates PV of cash flows to price.
C.    The face value divided by price.

Financial Statement Analysis: Practice Pack
Question 1 of 1
Question
What does the income statement report?
A.    Assets and liabilities.
B.    Revenues and expenses over a period.
C.    Cash flows from operations.

Income: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because coupon rate is fixed.
B.    Correct. Yield is the discount rate equating PV to price.
C.    Incorrect because that describes current yield only.

Financial Statement Analysis: Practice Pack- Answers
Answer 1 of 1
Answer
Solution
A.    Incorrect because that is the balance sheet.
B.    Correct. The income statement reports revenues and expenses.
C.    Incorrect because that is the cash flow statement.
`;
    const sections = splitBySubject(fullText);
    expect(sections.length).toBe(2);

    const fi = sections.find(s => s.subject === 'Fixed Income');
    const fsa = sections.find(s => s.subject === 'Financial Statement Analysis');
    expect(fi).toBeDefined();
    expect(fsa).toBeDefined();
    expect(fi!.questionsText).toContain('bond yield');
    expect(fi!.answersText).toContain('discount rate equating PV');
    expect(fsa!.questionsText).toContain('income statement report');
    expect(fsa!.answersText).toContain('revenues and expenses');
  });
});

describe('splitBySubject fallback: Question 1 of X restarts', () => {
  it('detects two sections when OCR completely mangles one header (FSA & Fixed Income PDF)', () => {
    // Simulates: Fixed Income header is found, but FSA header is completely mangled
    // The "Question 1 of X" restarts still work perfectly
    const fullText = `Some preamble garbage text.

Fixed Income: Practice Pack
Question 1 of 106
Question
What is a bond?
A.    A debt instrument.
B.    An equity instrument.
C.    A derivative contract.

Question 2 of 106
Question
What is coupon rate?
A.    The annual interest.
B.    The market price.
C.    The yield to maturity.

oe sncivade Practiea Pad
Question 1 of 130
Question
What does the income statement report?
A.    Assets and liabilities.
B.    Revenues and expenses.
C.    Cash flows from operations.

Question 2 of 130
Question
What is depreciation?
A.    A cash outflow.
B.    Allocation of cost over useful life.
C.    A revenue item.

Fixed Income: Practice Pack- Answers
Answer 1 of 106
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity is ownership.
C.    Incorrect because derivatives derive value.

Answer 2 of 106
Answer
Solution
A.    Correct. Coupon rate is the annual interest payment.
B.    Incorrect because market price fluctuates.
C.    Incorrect because YTM is different from coupon.

oe sncivade Practiea Pad- Anewrs
Answer 1 of 130
Answer
Solution
A.    Incorrect because that is the balance sheet.
B.    Correct. The income statement reports revenues and expenses.
C.    Incorrect because that is the cash flow statement.

Answer 2 of 130
Answer
Solution
A.    Incorrect because depreciation is non-cash.
B.    Correct. Depreciation allocates cost over useful life.
C.    Incorrect because it is an expense.
`;
    // Header-based approach finds only "Fixed Income" (1 section)
    // But there are 2 "Question 1 of X" restarts -> fallback activates
    const sections = splitBySubject(fullText, 'OCR_CFA L1 2025_FSA & Fixed Income.pdf');
    expect(sections.length).toBe(2);

    const fi = sections.find(s => s.subject === 'Fixed Income');
    const fsa = sections.find(s => s.subject === 'Financial Statement Analysis');

    expect(fi).toBeDefined();
    expect(fsa).toBeDefined();

    // Verify Fixed Income section content
    const fiQuestions = parsePremiumQuestions(fi!.questionsText);
    expect(fiQuestions.length).toBe(2);
    expect(fiQuestions[0].text).toContain('bond');

    const fiAnswers = parsePremiumAnswers(fi!.answersText);
    expect(fiAnswers.length).toBe(2);
    expect(fiAnswers[0].correctLabel).toBe('A');

    // Verify FSA section content
    const fsaQuestions = parsePremiumQuestions(fsa!.questionsText);
    expect(fsaQuestions.length).toBe(2);
    expect(fsaQuestions[0].text).toContain('income statement');

    const fsaAnswers = parsePremiumAnswers(fsa!.answersText);
    expect(fsaAnswers.length).toBe(2);
    expect(fsaAnswers[0].correctLabel).toBe('B');
  });

  it('detects two sections when OCR completely mangles one header (Portfolio & Quants PDF)', () => {
    // Simulates: Portfolio Management header is found, but Quants header is completely mangled
    const fullText = `Preamble text.

Portfolio Management: Practice Pack
Question 1 of 100
Question
What is the primary goal of portfolio management?
A.    Maximizing returns only.
B.    Balancing risk and return.
C.    Minimizing all risk.

Quntttve Mthds Practiea Pad
Question 1 of 90
Question
What is a standard deviation?
A.    A measure of central tendency.
B.    A measure of dispersion.
C.    A measure of skewness.

Portfolio Management: Practice Pack- Answers
Answer 1 of 100
Answer
Solution
A.    Incorrect because risk must also be considered.
B.    Correct. Portfolio management balances risk and return.
C.    Incorrect because some risk is acceptable.

Quntttve Mthds Practiea Pad- Anewrs
Answer 1 of 90
Answer
Solution
A.    Incorrect because that is the mean.
B.    Correct. Standard deviation measures dispersion.
C.    Incorrect because skewness is different.
`;
    const sections = splitBySubject(fullText, 'OCR_CFA L1 2025_Portfolio Mngt & Quants.pdf');
    expect(sections.length).toBe(2);

    const pm = sections.find(s => s.subject === 'Portfolio Management');
    const qm = sections.find(s => s.subject === 'Quantitative Methods');

    expect(pm).toBeDefined();
    expect(qm).toBeDefined();

    const pmQuestions = parsePremiumQuestions(pm!.questionsText);
    expect(pmQuestions.length).toBe(1);
    expect(pmQuestions[0].text).toContain('primary goal');

    const pmAnswers = parsePremiumAnswers(pm!.answersText);
    expect(pmAnswers.length).toBe(1);
    expect(pmAnswers[0].correctLabel).toBe('B');

    const qmQuestions = parsePremiumQuestions(qm!.questionsText);
    expect(qmQuestions.length).toBe(1);
    expect(qmQuestions[0].text).toContain('standard deviation');

    const qmAnswers = parsePremiumAnswers(qm!.answersText);
    expect(qmAnswers.length).toBe(1);
    expect(qmAnswers[0].correctLabel).toBe('B');
  });

  it('does NOT activate fallback when header-based approach finds all sections', () => {
    // Both headers are properly detected - fallback should not interfere
    const fullText = `
Economics: Practice Pack
Question 1 of 50
Question
GDP measures what?
A.    All goods produced.
B.    Final goods and services.
C.    Intermediate goods only.

Alternative Investments: Practice Pack
Question 1 of 40
Question
Hedge funds are structured as:
A.    Limited partnerships.
B.    Public corporations.
C.    Government agencies.

Economics: Practice Pack - Answers
Answer 1 of 50
Answer
Solution
A.    Incorrect because only final goods are counted.
B.    Correct. GDP measures final goods and services.
C.    Incorrect because intermediate goods are excluded.

Alternative Investments: Practice Pack- Answers
Answer 1 of 40
Answer
Solution
A.    Correct. Hedge funds are typically limited partnerships.
B.    Incorrect because they are private vehicles.
C.    Incorrect because they are not government entities.
`;
    const sections = splitBySubject(fullText, 'OCR_CFA L1 2025_Economics & Alt Investments.pdf');
    expect(sections.length).toBe(2);

    const econ = sections.find(s => s.subject === 'Economics');
    const alt = sections.find(s => s.subject === 'Alternative Investments');
    expect(econ).toBeDefined();
    expect(alt).toBeDefined();
  });

  it('handles completely mangled headers with NO headers detected (both subjects from filename)', () => {
    // Both headers are completely mangled - neither "Practice Pack" nor ":" is preserved
    // When no headers are found, subjects are assigned in filename keyword order
    const fullText = `Some random preamble.

oe sncivade Practiea Pad
Question 1 of 106
Question
What is a bond?
A.    A debt instrument.
B.    An equity instrument.
C.    A derivative.

xnncl Sttemnt Anlss Practiea Pad
Question 1 of 130
Question
What is depreciation?
A.    A cash outflow.
B.    Allocation of cost.
C.    A revenue item.

oe sncivade Practiea Pad Anewrs
Answer 1 of 106
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity is ownership.
C.    Incorrect because derivatives derive value.

xnncl Sttemnt Anlss Practiea Pad Anewrs
Answer 1 of 130
Answer
Solution
A.    Incorrect because it is non-cash.
B.    Correct. Depreciation allocates cost.
C.    Incorrect because it is an expense.
`;
    // Filename: "OCR_CFA L1 2025_FSA & Fixed Income.pdf"
    // "fsa" appears at position 18, "fixed income" at position 24
    // So filename order is: [FSA, Fixed Income]
    // First restart (106) gets FSA, second restart (130) gets Fixed Income
    const sections = splitBySubject(fullText, 'OCR_CFA L1 2025_FSA & Fixed Income.pdf');
    expect(sections.length).toBe(2);

    // Both subjects are inferred from filename in filename-keyword-position order
    const fsa = sections.find(s => s.subject === 'Financial Statement Analysis');
    const fi = sections.find(s => s.subject === 'Fixed Income');
    expect(fsa).toBeDefined();
    expect(fi).toBeDefined();

    // FSA was assigned to the first restart (106 total) - the bond question
    const fsaQuestions = parsePremiumQuestions(fsa!.questionsText);
    expect(fsaQuestions.length).toBe(1);
    expect(fsaQuestions[0].text).toContain('bond');

    // Fixed Income was assigned to the second restart (130 total) - the depreciation question
    const fiQuestions = parsePremiumQuestions(fi!.questionsText);
    expect(fiQuestions.length).toBe(1);
    expect(fiQuestions[0].text).toContain('depreciation');
  });

  it('fallback pairs question and answer sections by matching totals', () => {
    // Questions: 106 first, then 130. Answers: 130 first, then 106.
    // The fallback must pair by total, not by position.
    const fullText = `Preamble.

Fixed Income: Practice Pack
Question 1 of 106
Question
What is a bond?
A.    A debt instrument.
B.    An equity instrument.
C.    A derivative.

Mangled Header Garbage
Question 1 of 130
Question
What is an income statement?
A.    A financial report.
B.    A tax document.
C.    A cash register receipt.

Mangled Answer Header
Answer 1 of 130
Answer
Solution
A.    Correct. An income statement is a financial report.
B.    Incorrect because it is not a tax document.
C.    Incorrect because it is not a receipt.

Fixed Income: Practice Pack- Answers
Answer 1 of 106
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity is ownership.
C.    Incorrect because derivatives derive value.
`;
    const sections = splitBySubject(fullText, 'OCR_CFA L1 2025_FSA & Fixed Income.pdf');
    expect(sections.length).toBe(2);

    const fi = sections.find(s => s.subject === 'Fixed Income');
    const fsa = sections.find(s => s.subject === 'Financial Statement Analysis');
    expect(fi).toBeDefined();
    expect(fsa).toBeDefined();

    // Verify correct pairing: Fixed Income (106) questions paired with 106 answers
    const fiAnswers = parsePremiumAnswers(fi!.answersText);
    expect(fiAnswers.length).toBe(1);
    expect(fiAnswers[0].correctLabel).toBe('A');

    // FSA (130) questions paired with 130 answers
    const fsaAnswers = parsePremiumAnswers(fsa!.answersText);
    expect(fsaAnswers.length).toBe(1);
    expect(fsaAnswers[0].correctLabel).toBe('A');
  });

  it('single-subject PDF does not trigger fallback (only one Question 1 of X)', () => {
    const fullText = `
Fixed Income: Practice Pack
Question 1 of 50
Question
What is a bond?
A.    A debt instrument.
B.    An equity instrument.
C.    A derivative.

Question 2 of 50
Question
What is yield?
A.    Interest rate.
B.    Discount rate.
C.    Coupon rate.

Fixed Income: Practice Pack- Answers
Answer 1 of 50
Answer
Solution
A.    Correct. A bond is a debt instrument.
B.    Incorrect because equity is ownership.
C.    Incorrect because derivatives derive value.

Answer 2 of 50
Answer
Solution
A.    Incorrect because interest rate is not yield.
B.    Correct. Yield is the discount rate.
C.    Incorrect because coupon rate is different.
`;
    const sections = splitBySubject(fullText, 'OCR_CFA L1 2025_Fixed Income.pdf');
    expect(sections.length).toBe(1);
    expect(sections[0].subject).toBe('Fixed Income');

    const questions = parsePremiumQuestions(sections[0].questionsText);
    expect(questions.length).toBe(2);
  });
});
