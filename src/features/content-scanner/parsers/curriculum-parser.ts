import type { ContentMetadata, ProviderParser } from '../types';
import { resolveSubject } from '../config/subject-mapping';

/**
 * Parser for CFA Institute Curriculum PDFs.
 * Pattern: cfa-program{year}L{level}V{volume}-{subject}.pdf
 * Example: cfa-program2026L1V4-FSA.pdf
 */
export const curriculumParser: ProviderParser = {
  slug: 'curriculum',
  name: 'CFA Institute Curriculum',

  matches(relativePath: string): boolean {
    return /curriculum\/level\d/i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      provider: 'curriculum',
      resourceType: 'curriculum',
    };

    // Pattern: cfa-program2026L1V4-FSA.pdf
    const match = fileName.match(/cfa-program(\d{4})L(\d)V(\d+)[- ]?(.+)\.pdf/i);
    if (match) {
      result.year = parseInt(match[1], 10);
      result.level = parseInt(match[2], 10);
      result.version = `V${match[3]}`;
      const subjectPart = match[4].replace(/[.\-_]/g, ' ').trim();
      result.subject = resolveSubject(subjectPart) ?? subjectPart;
    }

    return result;
  },
};
