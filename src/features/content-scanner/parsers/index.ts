import type { ProviderParser } from '../types';
import { curriculumParser } from './curriculum-parser';
import { schweserParser } from './schweser-parser';
import { iftParser } from './ift-parser';
import { markMeldrumParser } from './mark-meldrum-parser';
import { fintreeParser } from './fintree-parser';
import { questionBankParser } from './question-bank-parser';
import { mockParser } from './mock-parser';
import { formulaParser } from './formula-parser';

/**
 * Registry of all provider parsers.
 * Order matters: more specific parsers should come first.
 * The first parser whose `matches()` returns true is used.
 */
export const parserRegistry: ProviderParser[] = [
  curriculumParser,
  iftParser,
  markMeldrumParser,
  fintreeParser,
  schweserParser,  // After specific note providers (schweser QB is handled by questionBankParser)
  questionBankParser,
  mockParser,
  formulaParser,
];

/**
 * Find the appropriate parser for a given file path.
 * Returns null if no parser matches.
 */
export function findParser(relativePath: string): ProviderParser | null {
  for (const parser of parserRegistry) {
    if (parser.matches(relativePath)) {
      return parser;
    }
  }
  return null;
}
