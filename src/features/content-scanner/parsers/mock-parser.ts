import type { ContentMetadata, ProviderParser } from '../types';

/**
 * Parser for Mock Exams.
 * Patterns:
 *   Mock Exam {n}.pdf / Mock Exam {n} - Answers.pdf
 *   Mock {n} – Morning.pdf / Mock {n} - Afternoon - Answers.pdf
 *   SESSION 1 MOCK-Q.pdf / SESSION 1 MOCK-A.pdf
 */
export const mockParser: ProviderParser = {
  slug: 'mock',
  name: 'Mock Exam',

  matches(relativePath: string): boolean {
    return /mocks\//i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      resourceType: 'mock-exam',
    };

    // Detect answer/solution files
    const isAnswer = /\b(?:answers?|solutions?|MOCK-A)\b/i.test(fileName);
    if (isAnswer) {
      result.resourceType = 'answer-key';
    }

    // Infer provider from folder
    if (/schweser/i.test(relativePath)) {
      result.provider = 'schweser';
    } else if (/kevin sir/i.test(relativePath)) {
      result.provider = 'kevin-sir';
    } else if (/unknown/i.test(relativePath)) {
      result.provider = null; // Unknown provider
    }

    // Extract mock number: "Mock Exam 3" or "Mock 2"
    const mockNumMatch = fileName.match(/Mock(?:\s+Exam)?\s+(\d+)/i);
    if (mockNumMatch) {
      result.reading = `Mock ${mockNumMatch[1]}`;
    }

    // Extract session: "Morning" or "Afternoon" or "SESSION 1"
    const sessionMatch = fileName.match(/(Morning|Afternoon|SESSION\s+\d+)/i);
    if (sessionMatch) {
      result.topic = sessionMatch[1];
    }

    // Year from path
    const yearMatch = relativePath.match(/(\d{4})/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
    }

    return result;
  },
};
