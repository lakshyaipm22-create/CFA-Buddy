#!/usr/bin/env node
/**
 * CFA Buddy — Question Import Pipeline CLI
 *
 * Imports questions from CFA Curriculum End of Chapter PDFs.
 * Each PDF has PRACTICE PROBLEMS + SOLUTIONS sections in one file.
 *
 * Usage:
 *   npm run import:questions                           # Import all 10 subject PDFs
 *   npm run import:questions -- --file="path.pdf"      # Import single PDF
 *   npm run import:questions -- --dry-run              # Preview without saving
 *   npm run import:questions -- --append               # Add to existing (don't overwrite)
 *
 * Expected PDF structure:
 *   PRACTICE PROBLEMS
 *   1. Question text
 *      A. Option A
 *      B. Option B
 *      C. Option C
 *   ...
 *   SOLUTIONS
 *   1. C is correct. Explanation text...
 *   2. A is correct. Explanation text...
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import type { Question } from '../features/question-bank/types';

// Subject mapping by filename prefix number
const SUBJECT_MAP: Record<string, string> = {
  '1': 'Quantitative Methods',
  '2': 'Economics',
  '3': 'Corporate Issuers',
  '4': 'Financial Statement Analysis',
  '5': 'Equity Investments',
  '6': 'Fixed Income',
  '7': 'Derivatives',
  '8': 'Alternative Investments',
  '9': 'Portfolio Management',
  '10': 'Ethical and Professional Standards',
};

function inferSubject(filename: string): string {
  const numMatch = filename.match(/^(\d+)\./);
  if (numMatch) return SUBJECT_MAP[numMatch[1]] ?? 'Unknown';
  // Fallback: check name
  const lower = filename.toLowerCase();
  if (lower.includes('quantitative') || lower.includes('qm')) return 'Quantitative Methods';
  if (lower.includes('economics') || lower.includes('eco')) return 'Economics';
  if (lower.includes('corporate')) return 'Corporate Issuers';
  if (lower.includes('financial statement') || lower.includes('fsa')) return 'Financial Statement Analysis';
  if (lower.includes('equity')) return 'Equity Investments';
  if (lower.includes('fixed income') || lower.includes('fi')) return 'Fixed Income';
  if (lower.includes('derivative')) return 'Derivatives';
  if (lower.includes('alternative')) return 'Alternative Investments';
  if (lower.includes('portfolio')) return 'Portfolio Management';
  if (lower.includes('ethics') || lower.includes('professional')) return 'Ethical and Professional Standards';
  return 'Unknown';
}

interface ParsedQ {
  num: number;
  text: string;
  choices: Array<{ label: string; text: string }>;
}

interface ParsedSolution {
  num: number;
  correctLetter: string;
  explanation: string;
}

/**
 * Split PDF text into PRACTICE PROBLEMS and SOLUTIONS sections.
 */
function splitSections(text: string): { problems: string; solutions: string } {
  // Find PRACTICE PROBLEMS header
  const problemsIdx = text.search(/PRACTICE\s+PROBLEMS/i);
  // Find SOLUTIONS header
  const solutionsIdx = text.search(/\bSOLUTIONS\b/i);

  if (problemsIdx === -1 || solutionsIdx === -1) {
    return { problems: text, solutions: '' };
  }

  const problems = text.slice(problemsIdx, solutionsIdx);
  const solutions = text.slice(solutionsIdx);
  return { problems, solutions };
}

/**
 * Parse PRACTICE PROBLEMS section into questions.
 */
function parseProblems(text: string): ParsedQ[] {
  const questions: ParsedQ[] = [];

  // Split into question blocks by numbered patterns (1. , 2. , etc.)
  // Look for pattern: newline + number + period/dot at start
  const blocks: Array<{ num: number; content: string }> = [];
  const qPattern = /(?:^|\n)\s*(\d+)\.\s+/g;
  const starts: Array<{ num: number; idx: number }> = [];

  let m;
  while ((m = qPattern.exec(text)) !== null) {
    starts.push({ num: parseInt(m[1]), idx: m.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].idx : text.length;
    const content = text.slice(starts[i].idx, end).replace(/^\s*\d+\.\s+/, '').trim();
    blocks.push({ num: starts[i].num, content });
  }

  for (const block of blocks) {
    // Extract choices: A. ... B. ... C. ...
    const choiceRegex = /(?:^|\n)\s*([A-D])\.\s+([\s\S]*?)(?=(?:\n\s*[A-D]\.\s)|$)/g;
    const choices: Array<{ label: string; text: string }> = [];
    let firstChoiceIdx = block.content.length;

    let cm;
    while ((cm = choiceRegex.exec(block.content)) !== null) {
      if (choices.length === 0) firstChoiceIdx = cm.index;
      choices.push({
        label: cm[1],
        text: cm[2].replace(/\n/g, ' ').trim(),
      });
    }

    if (choices.length < 2) continue;

    const questionText = block.content.slice(0, firstChoiceIdx).replace(/\n/g, ' ').trim();
    if (questionText.length < 10) continue;

    questions.push({ num: block.num, text: questionText, choices });
  }

  return questions;
}

/**
 * Parse SOLUTIONS section into answers.
 * Handles multiple answer formats:
 *   "1. C is correct. Explanation..."
 *   "1. C. Explanation..."
 *   "1. C Explanation..."
 *   "1. C\nExplanation..."
 */
export function parseSolutions(text: string): ParsedSolution[] {
  const solutions: ParsedSolution[] = [];

  // Phase 1: Split into numbered blocks (same approach as parseProblems)
  const blockPattern = /(?:^|\n)\s*(\d+)\.\s+/g;
  const starts: Array<{ num: number; idx: number }> = [];

  let m;
  while ((m = blockPattern.exec(text)) !== null) {
    starts.push({ num: parseInt(m[1]), idx: m.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].idx : text.length;
    const content = text.slice(starts[i].idx, end).replace(/^\s*\d+\.\s+/, '').trim();

    // Phase 2: Try multiple patterns to extract the answer letter (in order of specificity)
    let correctLetter = '';
    let explanation = '';

    // Pattern 1: "C is correct. Explanation..." or "C is correct because..."
    const p1 = content.match(/^([A-D])\s+is\s+correct[.]?\s*([\s\S]*)/i);
    if (p1) {
      correctLetter = p1[1].toUpperCase();
      explanation = p1[2].replace(/\n/g, ' ').trim();
    }

    // Pattern 2: "C. Explanation..." (letter + period + space)
    if (!correctLetter) {
      const p2 = content.match(/^([A-D])\.\s+([\s\S]*)/);
      if (p2) {
        correctLetter = p2[1].toUpperCase();
        explanation = p2[2].replace(/\n/g, ' ').trim();
      }
    }

    // Pattern 3: "C Explanation..." (letter + space + text, NOT "is correct" which is pattern 1)
    if (!correctLetter) {
      const p3 = content.match(/^([A-D])\s+(?!is\s+correct)([\s\S]*)/i);
      if (p3) {
        correctLetter = p3[1].toUpperCase();
        explanation = p3[2].replace(/\n/g, ' ').trim();
      }
    }

    // Pattern 4: "C" alone on first line, explanation follows on next line
    if (!correctLetter) {
      const p4 = content.match(/^([A-D])\s*\n([\s\S]*)/m);
      if (p4) {
        correctLetter = p4[1].toUpperCase();
        explanation = p4[2].replace(/\n/g, ' ').trim();
      }
    }

    if (correctLetter) {
      solutions.push({
        num: starts[i].num,
        correctLetter,
        explanation,
      });
    }
  }

  return solutions;
}

/**
 * Merge questions with solutions to produce final Question objects.
 */
function buildQuestions(problems: ParsedQ[], solutions: ParsedSolution[], subject: string, sourceFile: string): Question[] {
  const solutionMap = new Map(solutions.map(s => [s.num, s]));

  return problems.map((q) => {
    const sol = solutionMap.get(q.num);
    const correctLetter = sol?.correctLetter ?? '';
    const explanation = sol?.explanation ?? '';

    return {
      id: `imported-${sourceFile.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${q.num}`,
      questionText: q.text,
      answerChoices: q.choices.map(c => ({
        label: c.label,
        text: c.text,
        isCorrect: c.label === correctLetter,
        explanation: c.label === correctLetter
          ? explanation || 'Correct answer.'
          : `Incorrect. ${correctLetter ? `The correct answer is ${correctLetter}.` : 'See explanation for correct answer.'}`,
      })),
      difficulty: 'Medium' as const,
      subject,
      reading: null,
      topic: null,
      provider: 'curriculum',
      questionSourceFile: sourceFile,
    };
  });
}

async function importSingleFile(filePath: string, dryRun: boolean, append: boolean): Promise<Question[]> {
  const filename = basename(filePath);
  const subject = inferSubject(filename);

  console.log(`  📄 ${filename} (${subject})`);

  // pdf-parse: handle both ESM default export and CJS module.exports
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = pdfParseModule.default ?? pdfParseModule;

  const buffer = await readFile(filePath);
  const { text } = await pdfParse(buffer);
  console.log(`     Extracted ${text.length} chars`);

  const { problems, solutions } = splitSections(text);
  const parsedQuestions = parseProblems(problems);
  const parsedSolutions = parseSolutions(solutions);

  console.log(`     Questions: ${parsedQuestions.length}, Solutions: ${parsedSolutions.length}`);

  const questions = buildQuestions(parsedQuestions, parsedSolutions, subject, filename);
  const matched = questions.filter(q => q.answerChoices.some(c => c.isCorrect)).length;
  console.log(`     Matched: ${matched}/${questions.length}`);

  if (!dryRun) {
    const outputDir = join(process.cwd(), 'content', 'metadata', 'imported-questions');
    await mkdir(outputDir, { recursive: true });

    const outName = filename.replace('.pdf', '.json');
    const outputFile = join(outputDir, outName);

    if (append) {
      try {
        const existing = JSON.parse(await readFile(outputFile, 'utf-8')) as Question[];
        const merged = [...existing, ...questions];
        await writeFile(outputFile, JSON.stringify(merged, null, 2));
      } catch {
        await writeFile(outputFile, JSON.stringify(questions, null, 2));
      }
    } else {
      await writeFile(outputFile, JSON.stringify(questions, null, 2));
    }
    console.log(`     ✅ Saved to ${outName}`);
  } else {
    console.log(`     (dry-run — not saved)`);
  }

  return questions;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const append = args.includes('--append');

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  CFA Buddy — Question Import Pipeline             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (dryRun) console.log('  Mode: DRY RUN (no files will be written)\n');
  if (append) console.log('  Mode: APPEND (adding to existing files)\n');

  let allQuestions: Question[] = [];

  try {
    if (fileArg) {
      // Single file mode
      allQuestions = await importSingleFile(fileArg, dryRun, append);
    } else {
      // Batch mode: scan for PDFs in question-banks/level1/
      const searchDirs = [
        join(process.cwd(), 'content', 'question-banks', 'level1'),
        join(process.cwd(), 'content', 'question-banks', 'level1', '2025 Curriculm End of Chapter Qts'),
      ];

      const pdfFiles: string[] = [];
      for (const dir of searchDirs) {
        try {
          const files = await readdir(dir);
          const pdfs = files.filter(f => f.endsWith('.pdf')).map(f => join(dir, f));
          pdfFiles.push(...pdfs);
        } catch { /* dir doesn't exist */ }
      }

      if (pdfFiles.length === 0) {
        console.log('  No PDF files found in content/question-banks/level1/');
        console.log('  Place your CFA curriculum PDFs there and run again.');
        console.log('  Expected: "1. Quantitative Methods.pdf", "2. Economics.pdf", etc.\n');
        process.exit(0);
      }

      console.log(`  Found ${pdfFiles.length} PDF files\n`);

      for (const pdf of pdfFiles.sort()) {
        try {
          const questions = await importSingleFile(pdf, dryRun, append);
          allQuestions.push(...questions);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown';
          console.log(`     ⚠️  Skipped (${msg})`);
        }
      }
    }

    // Summary
    console.log('\n  ═══════════════════════════════════════');
    console.log(`  Total imported: ${allQuestions.length} questions`);
    console.log(`  With answers: ${allQuestions.filter(q => q.answerChoices.some(c => c.isCorrect)).length}`);
    console.log(`  Subjects: ${[...new Set(allQuestions.map(q => q.subject))].join(', ')}`);
    console.log('  ═══════════════════════════════════════\n');

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Import failed: ${msg}`);
    process.exit(1);
  }
}

// Only run CLI when executed directly (not when imported for testing)
const isDirectExecution = typeof process !== 'undefined'
  && process.argv[1]
  && !process.argv[1].includes('vitest');

if (isDirectExecution) {
  main();
}
