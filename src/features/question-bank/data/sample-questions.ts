import type { Question } from '../types';

/**
 * Sample CFA Level I questions for development/testing.
 * These simulate real questions and allow the full test experience to work
 * before the Question Import Pipeline is connected.
 */
export const sampleQuestions: Question[] = [
  {
    id: 'sample-1',
    questionText: 'Which of the following is most likely found in the management commentary?',
    answerChoices: [
      { label: 'A', text: 'Forward-looking disclosures', isCorrect: true, explanation: 'The management commentary, or MD&A, is a good starting place for understanding information in the financial statements. The forward-looking disclosures are useful in projecting a company\'s future performance.' },
      { label: 'B', text: 'Basis of preparation for the financial statements', isCorrect: false, explanation: 'The notes disclose the basis of preparation for the financial statements.' },
      { label: 'C', text: 'Reasonable assurance whether the financial statements are free from material misstatement', isCorrect: false, explanation: 'This is the objective of an auditor, not found in management commentary.' },
    ],
    difficulty: 'Easy',
    subject: 'Financial Statement Analysis',
    reading: 'Introduction to Financial Statement Analysis',
    topic: 'Financial Reporting',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'sample-2',
    questionText: 'An adverse audit opinion is most likely issued when:',
    answerChoices: [
      { label: 'A', text: 'The financial statements materially depart from accounting standards and are not fairly presented', isCorrect: true, explanation: 'An adverse audit opinion is issued when an auditor determines that the financial statements materially depart from accounting standards and are not fairly presented.' },
      { label: 'B', text: 'There is some scope limitation or exception to accounting standards', isCorrect: false, explanation: 'This describes a qualified opinion.' },
      { label: 'C', text: 'The auditors are unable to issue an opinion due to a scope limitation', isCorrect: false, explanation: 'This describes a disclaimer of opinion.' },
    ],
    difficulty: 'Medium',
    subject: 'Financial Statement Analysis',
    reading: 'Introduction to Financial Statement Analysis',
    topic: 'Audit Reports',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'sample-3',
    questionText: 'The primary role of financial statement analysis is best described as:',
    answerChoices: [
      { label: 'A', text: 'Providing information useful for making investment decisions', isCorrect: false, explanation: 'This is too narrow — FSA is broader than just investment decisions.' },
      { label: 'B', text: 'Evaluating a company for the purpose of making economic decisions', isCorrect: true, explanation: 'The primary role of financial statement analysis is to use financial reports prepared by companies to evaluate their past, current, and potential performance and financial position for the purpose of making investment, credit, and other economic decisions.' },
      { label: 'C', text: 'Using financial reports prepared by analysts to make economic decisions', isCorrect: false, explanation: 'Financial reports are prepared by companies, not analysts.' },
    ],
    difficulty: 'Easy',
    subject: 'Financial Statement Analysis',
    reading: 'Introduction to Financial Statement Analysis',
    topic: 'Role of FSA',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'sample-4',
    questionText: 'The time value of money concept is most accurately described as:',
    answerChoices: [
      { label: 'A', text: 'A dollar today is worth more than a dollar in the future', isCorrect: true, explanation: 'The time value of money reflects the idea that money available today can be invested to earn interest, making it worth more than the same amount received in the future.' },
      { label: 'B', text: 'All investments earn the same rate of return over time', isCorrect: false, explanation: 'Different investments carry different risk levels and expected returns.' },
      { label: 'C', text: 'The purchasing power of money is constant over time', isCorrect: false, explanation: 'Inflation generally erodes purchasing power over time.' },
    ],
    difficulty: 'Easy',
    subject: 'Quantitative Methods',
    reading: 'The Time Value of Money in Finance',
    topic: 'TVM Concepts',
    provider: 'curriculum',
    questionSourceFile: null,
  },
  {
    id: 'sample-5',
    questionText: 'Which of the following market structures is characterized by many firms selling differentiated products?',
    answerChoices: [
      { label: 'A', text: 'Perfect competition', isCorrect: false, explanation: 'Perfect competition features many firms selling identical products.' },
      { label: 'B', text: 'Monopolistic competition', isCorrect: true, explanation: 'Monopolistic competition is characterized by many firms selling differentiated products with relatively low barriers to entry.' },
      { label: 'C', text: 'Oligopoly', isCorrect: false, explanation: 'Oligopoly features few firms with significant barriers to entry.' },
    ],
    difficulty: 'Easy',
    subject: 'Economics',
    reading: 'Firms and Market Structures',
    topic: 'Market Structures',
    provider: 'curriculum',
    questionSourceFile: null,
  },
];
