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
  // Folder-structural parsers first: these check the top-level content-type
  // folder (mocks/, question-banks/, formulas/, curriculum/, notes/.../ift/)
  // and must win over provider-name substring parsers below, since a
  // provider name (e.g. "Schweser") can appear inside a mocks/ or
  // question-banks/ subfolder without that file being "schweser notes".
  mockParser,
  questionBankParser,
  formulaParser,
  curriculumParser,
  iftParser,
  markMeldrumParser,
  fintreeParser,
  // Provider-name substring parser last: catches remaining schweser/*
  // files that are plain subject notes, not mocks or question banks.
  schweserParser,
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
