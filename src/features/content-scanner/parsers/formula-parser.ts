import type { ContentMetadata, ProviderParser } from '../types';
import { inferSubject } from '../config/subject-mapping';

/**
 * Parser for Formula Sheets.
 * Pattern: formula sheet {subject}.pdf
 */
export const formulaParser: ProviderParser = {
  slug: 'formula',
  name: 'Formula Sheet',

  matches(relativePath: string): boolean {
    return /formulas\//i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      resourceType: 'formula-sheet',
    };

    // Try to extract subject from filename
    const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
    const subject = inferSubject(nameWithoutExt);
    if (subject) {
      result.subject = subject;
    }

    return result;
  },
};
