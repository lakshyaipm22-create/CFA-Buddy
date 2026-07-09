import type { ContentMetadata, ProviderParser } from '../types';
import { iftSubjectFolderMapping } from '../config/subject-mapping';

/**
 * Parser for IFT (Irfanullah Financial Training) Notes.
 * Pattern: {subject_folder}/LM{nn} {Reading Title} IFT Notes.pdf
 * Subject folders: "01 - Quantitative Methods", "02 - Economics", etc.
 */
export const iftParser: ProviderParser = {
  slug: 'ift',
  name: 'IFT (Irfanullah Financial Training)',

  matches(relativePath: string): boolean {
    return /\/ift\//i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      provider: 'ift',
      resourceType: 'ift-notes',
    };

    // Extract subject from folder: "01 - Quantitative Methods"
    const subjectFolderMatch = relativePath.match(/(\d{2})\s*-\s*([^/]+)/);
    if (subjectFolderMatch) {
      const num = subjectFolderMatch[1];
      result.subject = iftSubjectFolderMapping[num] ?? subjectFolderMatch[2].trim();
    }

    // Extract reading: LM01 Introduction to Financial Statement Analysis IFT Notes.pdf
    const readingMatch = fileName.match(/LM(\d{2})\s+(.+?)\s+IFT\s+Notes\.pdf/i);
    if (readingMatch) {
      result.readingNumber = parseInt(readingMatch[1], 10);
      result.reading = readingMatch[2].trim();
    }

    // Also handle underscore variant: LM01_Derivative_Instrument...IFT_Notes.pdf
    if (!readingMatch) {
      const underscoreMatch = fileName.match(/LM(\d{2})[_\s]+(.+?)[_\s]+IFT[_\s]+Notes\.pdf/i);
      if (underscoreMatch) {
        result.readingNumber = parseInt(underscoreMatch[1], 10);
        result.reading = underscoreMatch[2].replace(/_/g, ' ').replace(/,/g, '').trim();
      }
    }

    // Year from folder path: "IFT 2025 PDFs" or "IFT 2024 PDFs"
    const yearMatch = relativePath.match(/IFT\s+(\d{4})/i);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
    }

    return result;
  },
};
