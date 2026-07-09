import type { ContentMetadata, ProviderParser } from '../types';
import { inferSubject } from '../config/subject-mapping';

/**
 * Parser for Kaplan Schweser materials.
 * Notes pattern: CFA 2025 Level I - {Subjects}.pdf
 * QB pattern: Reading {nn} {Title}.pdf / Reading {nn} {Title} - Answers.pdf
 */
export const schweserParser: ProviderParser = {
  slug: 'schweser',
  name: 'Kaplan Schweser',

  matches(relativePath: string): boolean {
    return /schweser/i.test(relativePath) && !/question-banks/i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      provider: 'schweser',
      resourceType: 'schweser-notes',
    };

    // Pattern: CFA 2025 Level I - Quants, Eco, CI.pdf
    const notesMatch = fileName.match(/CFA\s+(\d{4})\s+Level\s+(\w+)\s*-\s*(.+)\.pdf/i);
    if (notesMatch) {
      result.year = parseInt(notesMatch[1], 10);
      result.subject = inferSubject(notesMatch[3]) ?? notesMatch[3];
      return result;
    }

    // Pattern: Reading {nn} {Title}.pdf
    const readingMatch = fileName.match(/Reading\s+(\d+)\s+(.+?)(?:\s*-\s*Answers)?\.pdf/i);
    if (readingMatch) {
      result.readingNumber = parseInt(readingMatch[1], 10);
      result.reading = readingMatch[2].trim();
      result.resourceType = fileName.toLowerCase().includes('answer') ? 'answer-key' : 'question-bank';
    }

    // Try year from path
    const yearMatch = relativePath.match(/(\d{4})/);
    if (yearMatch && !result.year) {
      result.year = parseInt(yearMatch[1], 10);
    }

    return result;
  },
};
