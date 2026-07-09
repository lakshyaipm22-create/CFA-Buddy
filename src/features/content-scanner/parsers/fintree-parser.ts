import type { ContentMetadata, ProviderParser } from '../types';
import { inferSubject } from '../config/subject-mapping';

/**
 * Parser for Fintree / Juice Notes.
 * Pattern: L1 - JN - {Subject} 2024 V1.pdf
 * Also: Alternative Investments Juice Notes@2024.pdf
 */
export const fintreeParser: ProviderParser = {
  slug: 'fintree',
  name: 'Fintree',

  matches(relativePath: string): boolean {
    return /fintree|juice/i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      provider: 'fintree',
      resourceType: 'fintree-notes',
    };

    // Pattern: L1 - JN - Financial Statement Analysis 2024 V1.pdf
    const match = fileName.match(/L(\d)\s*-\s*JN\s*-\s*(.+?)\s+(\d{4})\s*(V\d+)?\.pdf/i);
    if (match) {
      result.level = parseInt(match[1], 10);
      result.subject = inferSubject(match[2]) ?? match[2].trim();
      result.year = parseInt(match[3], 10);
      result.version = match[4] ?? null;
      return result;
    }

    // Alternative pattern: Alternative Investments Juice Notes@2024.pdf
    const altMatch = fileName.match(/(.+?)\s*(?:Juice\s*Notes?)?@?(\d{4})\.pdf/i);
    if (altMatch) {
      result.subject = inferSubject(altMatch[1]) ?? altMatch[1].trim();
      result.year = parseInt(altMatch[2], 10);
    }

    return result;
  },
};
