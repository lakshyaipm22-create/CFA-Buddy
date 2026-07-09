import type { ContentMetadata, ProviderParser } from '../types';
import { inferSubject } from '../config/subject-mapping';

/**
 * Parser for Question Banks (Schweser QB, UWorld, EOC, Premium Practice Pack, 25th Hour).
 * 
 * Schweser: Reading {nn} {Title}.pdf / Reading {nn} {Title} - Answers.pdf
 * UWorld: {n}.{nn} {Title}.pdf / {n}.{nn} {Title} - Answers.pdf
 * EOC: {n}. {Subject}.pdf
 * Premium Practice: CFA L1 2025_{Subject Groups}.pdf
 */
export const questionBankParser: ProviderParser = {
  slug: 'question-bank',
  name: 'Question Bank',

  matches(relativePath: string): boolean {
    return /question-banks/i.test(relativePath);
  },

  extract(relativePath: string, fileName: string): Partial<ContentMetadata> {
    const result: Partial<ContentMetadata> = {
      resourceType: 'question-bank',
    };

    // Detect if this is an answer file
    const isAnswer = /\b(?:answers?|solutions?|answer\s*key)\b/i.test(fileName);
    if (isAnswer) {
      result.resourceType = 'answer-key';
    }

    // Infer provider from folder path
    if (/uworld/i.test(relativePath)) {
      result.provider = 'uworld';
    } else if (/schweser.*q.*b/i.test(relativePath)) {
      result.provider = 'schweser';
    } else if (/premium\s*practice/i.test(relativePath)) {
      result.provider = 'curriculum';
    } else if (/25th\s*hour/i.test(relativePath)) {
      result.provider = '25th-hour';
    } else if (/end\s*of\s*chapter|curriculum/i.test(relativePath)) {
      result.provider = 'curriculum';
    }

    // UWorld pattern: 1.01 Rates and Returns.pdf
    const uworldMatch = fileName.match(/(\d+)\.(\d{2})\s+(.+?)(?:\s*-\s*Answers?)?\.pdf/i);
    if (uworldMatch) {
      result.readingNumber = parseInt(uworldMatch[2], 10);
      result.reading = uworldMatch[3].trim();
      return result;
    }

    // Schweser/EOC pattern: Reading 29 Introduction to Financial Statement Analysis.pdf
    const readingMatch = fileName.match(/Reading\s+(\d+)\s+(.+?)(?:\s*-\s*Answers?)?\.pdf/i);
    if (readingMatch) {
      result.readingNumber = parseInt(readingMatch[1], 10);
      result.reading = readingMatch[2].trim();
      return result;
    }

    // EOC subject-level: 4. Financial Statement Analysis.pdf
    const eocMatch = fileName.match(/^(\d+)\.\s*(.+?)\.pdf/i);
    if (eocMatch) {
      result.subject = inferSubject(eocMatch[2]) ?? eocMatch[2].trim();
      return result;
    }

    // Premium Practice: CFA L1 2025_FSA & Fixed Income.pdf
    const premiumMatch = fileName.match(/CFA\s+L(\d)\s+(\d{4})[_ ](.+?)\.pdf/i);
    if (premiumMatch) {
      result.level = parseInt(premiumMatch[1], 10);
      result.year = parseInt(premiumMatch[2], 10);
      result.subject = inferSubject(premiumMatch[3]) ?? premiumMatch[3].trim();
      return result;
    }

    // Try subject from folder name
    const folderParts = relativePath.split('/');
    for (const part of folderParts) {
      const subject = inferSubject(part);
      if (subject) {
        result.subject = subject;
        break;
      }
    }

    // Year from path
    const yearMatch = relativePath.match(/(\d{4})/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
    }

    return result;
  },
};
