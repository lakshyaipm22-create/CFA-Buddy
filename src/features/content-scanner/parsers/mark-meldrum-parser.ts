import type { ContentMetadata, ProviderParser } from '../types';
import { resolveSubject } from '../config/subject-mapping';

/**
 * Parser for Mark Meldrum notes.
 * Pattern: 2024-L1-{Subject}.pdf
 */
export const markMeldrumParser: ProviderParser = {
  slug: 'mark-meldrum',
  name: 'Mark Meldrum',

  matches(relativePath: string): boolean {
    return /mark-meldrum/i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      provider: 'mark-meldrum',
      resourceType: 'mark-meldrum-notes',
    };

    // Pattern: 2024-L1-FSA.pdf or 2024-L1-QuantMethods.pdf
    const match = fileName.match(/(\d{4})-L(\d)-(.+)\.pdf/i);
    if (match) {
      result.year = parseInt(match[1], 10);
      result.level = parseInt(match[2], 10);
      const subjectPart = match[3].replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
      result.subject = resolveSubject(subjectPart) ?? subjectPart;
    }

    // Handle special files like "R1_Rates & Return_Quants notes.pdf"
    if (!match) {
      const altMatch = fileName.match(/R(\d+)[_ ](.+?)(?:_| )notes?\.pdf/i);
      if (altMatch) {
        result.readingNumber = parseInt(altMatch[1], 10);
        result.reading = altMatch[2].replace(/_/g, ' ').trim();
      }
    }

    return result;
  },
};
