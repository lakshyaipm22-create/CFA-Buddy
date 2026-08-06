#!/usr/bin/env node
/**
 * CFA Buddy — Question Import Pipeline CLI
 *
 * Imports questions from CFA Curriculum End of Chapter PDFs.
 * Each PDF has PRACTICE PROBLEMS + SOLUTIONS sections in one file.
 * Also supports paired Q/A files: a question PDF matched to a separate answers PDF.
 *
 * Usage:
 *   npm run import:questions                           # Import all 10 subject PDFs
 *   npm run import:questions -- --file="path.pdf"      # Import single PDF
 *   npm run import:questions -- --dry-run              # Preview without saving
 *   npm run import:questions -- --append               # Add to existing (don't overwrite)
 *   npm run import:questions -- --paired               # Use paired Q/A file correlation
 *
 * Expected PDF structure (single-file mode):
 *   PRACTICE PROBLEMS
 *   1. Question text
 *      A. Option A
 *      B. Option B
 *      C. Option C
 *   ...
 *   SOLUTIONS
 *   1. C is correct. Explanation text...
 *   2. A is correct. Explanation text...
 *
 * Paired file correlation:
 *   Questions: "Topic_Name.pdf" or "Topic_Name - Questions.pdf"
 *   Answers:   "Topic_Name - Answers.pdf" or "Topic_Name - Solutions.pdf"
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { Question } from '../features/question-bank/types';

const require = createRequire(import.meta.url);

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
 * Parse questions and solutions from PDF text using a HYBRID approach:
 * 
 * 1. First, try DIRECT matching (old approach): parse all questions, parse all
 *    solutions, match by number directly. This works perfectly for single-chapter
 *    PDFs where questions are numbered 1→N and solutions are numbered 1→N.
 * 
 * 2. If direct matching produces a LOW match rate (<60%), fall back to
 *    CHAPTER-SPLIT approach: detect numbering resets to identify chapter
 *    boundaries, then match within each chapter.
 * 
 * This hybrid ensures the 7 subjects that worked perfectly before still work,
 * while the 3 multi-chapter subjects get the chapter-aware treatment.
 */
function smartParseQuestionsAndSolutions(text: string): { questions: ParsedQ[]; solutions: ParsedSolution[] } {
  // Parse all questions and solutions from the full text
  const allQuestions = parseProblems(text);
  const allSolutions = parseSolutions(text);

  // Attempt 1: DIRECT matching by number (works for single-chapter PDFs)
  const directMatchCount = allQuestions.filter(q => 
    allSolutions.some(s => s.num === q.num)
  ).length;
  const directMatchRate = allQuestions.length > 0 ? directMatchCount / allQuestions.length : 0;

  // If direct matching works well (≥60% match rate), use it
  if (directMatchRate >= 0.6) {
    // Renumber globally (they're already globally numbered in single-chapter)
    return { questions: allQuestions, solutions: allSolutions };
  }

  // Attempt 2: CHAPTER-SPLIT approach for multi-chapter PDFs
  // Detect chapter boundaries by numbering resets in questions
  const questionChapters: ParsedQ[][] = [];
  let currentChapter: ParsedQ[] = [];
  
  for (const q of allQuestions) {
    if (q.num === 1 && currentChapter.length > 0) {
      questionChapters.push(currentChapter);
      currentChapter = [];
    }
    currentChapter.push(q);
  }
  if (currentChapter.length > 0) questionChapters.push(currentChapter);

  // Detect chapter boundaries in solutions
  const solutionChapters: ParsedSolution[][] = [];
  let currentSolChapter: ParsedSolution[] = [];
  
  for (const s of allSolutions) {
    if (s.num === 1 && currentSolChapter.length > 0) {
      solutionChapters.push(currentSolChapter);
      currentSolChapter = [];
    }
    currentSolChapter.push(s);
  }
  if (currentSolChapter.length > 0) solutionChapters.push(currentSolChapter);

  // Renumber globally and match by chapter
  const globalQuestions: ParsedQ[] = [];
  const globalSolutions: ParsedSolution[] = [];
  let globalNum = 0;

  for (let chIdx = 0; chIdx < questionChapters.length; chIdx++) {
    const chapterQs = questionChapters[chIdx];
    const chapterSols = chIdx < solutionChapters.length ? solutionChapters[chIdx] : [];

    for (const q of chapterQs) {
      globalNum++;
      const localNum = q.num;
      globalQuestions.push({ ...q, num: globalNum });

      const matchingSol = chapterSols.find(s => s.num === localNum);
      if (matchingSol) {
        globalSolutions.push({ ...matchingSol, num: globalNum });
      }
    }
  }

  return { questions: globalQuestions, solutions: globalSolutions };
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

    // Pattern 3: "C Explanation..." (letter + non-newline whitespace + text, NOT "is correct" or "correct")
    if (!correctLetter) {
      const p3 = content.match(/^([A-D])[ \t]+(?!(?:is\s+)?correct)([\s\S]*)/i);
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

  const buffer = await readFile(filePath);

  // pdf-parse: use createRequire for CJS compatibility with tsx on Windows
  const { PDFParse } = require('pdf-parse');
  const data = new Uint8Array(buffer);
  const parser = new PDFParse(data);
  await parser.load();
  const result = await parser.getText();
  const text: string = result.text;
  console.log(`     Extracted ${text.length} chars`);

  // Use hybrid approach: direct match for single-chapter, chapter-split for multi-chapter
  const { questions: allParsedQuestions, solutions: allParsedSolutions } = smartParseQuestionsAndSolutions(text);

  console.log(`     Questions: ${allParsedQuestions.length}, Solutions: ${allParsedSolutions.length}`);

  const questions = buildQuestions(allParsedQuestions, allParsedSolutions, subject, filename);
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

async function cleanImportedQuestions(): Promise<void> {
  const outputDir = join(process.cwd(), 'content', 'metadata', 'imported-questions');
  let totalBefore = 0;
  let totalAfter = 0;

  try {
    const files = await readdir(outputDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log('  No imported question files found. Run import first.\n');
      return;
    }

    console.log(`  Found ${jsonFiles.length} JSON files\n`);

    for (const file of jsonFiles.sort()) {
      const filePath = join(outputDir, file);
      const raw = await readFile(filePath, 'utf-8');
      const questions: Question[] = JSON.parse(raw);
      const before = questions.length;
      const valid = questions.filter(q => q.answerChoices.some(c => c.isCorrect));
      const removed = before - valid.length;

      totalBefore += before;
      totalAfter += valid.length;

      if (removed > 0) {
        await writeFile(filePath, JSON.stringify(valid, null, 2));
        console.log(`  📄 ${file}: ${before} → ${valid.length} (removed ${removed})`);
      } else {
        console.log(`  📄 ${file}: ${before} ✓ (all valid)`);
      }
    }

    console.log('\n  ═══════════════════════════════════════');
    console.log(`  Cleaned: ${totalBefore - totalAfter} questions without answers removed`);
    console.log(`  Remaining: ${totalAfter} valid questions`);
    console.log('  ═══════════════════════════════════════\n');
  } catch {
    console.log('  No imported-questions directory found. Run import first.\n');
  }
}

/**
 * Paired Q/A File Correlation
 *
 * Matches question PDFs with their corresponding answer PDFs by filename pattern.
 * Supports these pairing conventions:
 * - "Topic.pdf" pairs with "Topic - Answers.pdf" or "Topic - Solutions.pdf"
 * - "Topic - Questions.pdf" pairs with "Topic - Answers.pdf"
 * - Files in "questions/" subdir pair with same-named file in "answers/" subdir
 */
interface PairedFiles {
  questionsFile: string;
  answersFile: string | null;
  subject: string;
}

function correlateQAPairs(pdfFiles: string[]): PairedFiles[] {
  const pairs: PairedFiles[] = [];
  const used = new Set<string>();

  // Normalize path separators for consistent matching
  const normalize = (p: string) => p.replace(/\\/g, '/');

  // Sort files for deterministic processing
  const sorted = [...pdfFiles].sort();

  for (const file of sorted) {
    if (used.has(file)) continue;
    const norm = normalize(file);
    const name = basename(file, '.pdf');
    const dir = file.substring(0, file.lastIndexOf('/') >= 0 ? file.lastIndexOf('/') : file.lastIndexOf('\\'));

    // Skip files that look like answer/solution files
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes(' - answers') ||
      lowerName.includes(' - solutions') ||
      lowerName.includes('_answers') ||
      lowerName.includes('_solutions')
    ) {
      continue;
    }

    // Try to find a matching answer file
    const baseName = name
      .replace(/ - Questions$/i, '')
      .replace(/_Questions$/i, '')
      .replace(/ Questions$/i, '');

    const possibleAnswerNames = [
      `${baseName} - Answers.pdf`,
      `${baseName} - Solutions.pdf`,
      `${baseName}_Answers.pdf`,
      `${baseName}_Solutions.pdf`,
      `${baseName} Answers.pdf`,
      `${baseName} Solutions.pdf`,
    ];

    let answersFile: string | null = null;
    for (const ansName of possibleAnswerNames) {
      const candidate = join(dir, ansName);
      const found = sorted.find(f =>
        normalize(f).toLowerCase() === normalize(candidate).toLowerCase()
      );
      if (found) {
        answersFile = found;
        used.add(found);
        break;
      }
    }

    // Also check for directory-based pairing (questions/ -> answers/)
    if (!answersFile && norm.includes('/questions/')) {
      const answerPath = norm.replace('/questions/', '/answers/');
      const found = sorted.find(f => normalize(f).toLowerCase() === answerPath.toLowerCase());
      if (found) {
        answersFile = found;
        used.add(found);
      }
    }

    used.add(file);
    pairs.push({
      questionsFile: file,
      answersFile,
      subject: inferSubject(basename(file)),
    });
  }

  return pairs;
}

/**
 * Import from paired Q/A files: extract questions from one PDF
 * and solutions from the other, then merge them.
 */
async function importPairedFiles(
  pair: PairedFiles,
  dryRun: boolean,
  append: boolean
): Promise<Question[]> {
  const filename = basename(pair.questionsFile);
  console.log(`  📄 ${filename} (${pair.subject})`);
  if (pair.answersFile) {
    console.log(`     Paired with: ${basename(pair.answersFile)}`);
  }

  const buffer = await readFile(pair.questionsFile);
  const pdfParse = require('pdf-parse');
  const qData = await pdfParse(buffer);
  const questionText: string = qData.text;
  console.log(`     Questions: extracted ${questionText.length} chars`);

  let solutionText = '';
  if (pair.answersFile) {
    const ansBuffer = await readFile(pair.answersFile);
    const aData = await pdfParse(ansBuffer);
    solutionText = aData.text;
    console.log(`     Answers: extracted ${solutionText.length} chars`);
  }

  // Parse questions from the question file
  const allQuestions = parseProblems(questionText);

  // Parse solutions from either the same file or the paired answer file
  const allSolutions = solutionText
    ? parseSolutions(solutionText)
    : parseSolutions(questionText);

  console.log(`     Parsed: ${allQuestions.length} questions, ${allSolutions.length} solutions`);

  const questions = buildQuestions(allQuestions, allSolutions, pair.subject, filename);
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
    console.log(`     Saved to ${outName}`);
  } else {
    console.log(`     (dry-run - not saved)`);
  }

  return questions;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const append = args.includes('--append');
  const clean = args.includes('--clean');
  const paired = args.includes('--paired');

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  CFA Buddy — Question Import Pipeline             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Clean mode: remove questions without correct answers
  if (clean) {
    console.log('  Mode: CLEAN (removing questions without correct answers)\n');
    await cleanImportedQuestions();
    return;
  }

  if (dryRun) console.log('  Mode: DRY RUN (no files will be written)\n');
  if (append) console.log('  Mode: APPEND (adding to existing files)\n');
  if (paired) console.log('  Mode: PAIRED (matching Q/A file pairs)\n');

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

      if (paired) {
        // Paired mode: correlate Q/A files
        const pairs = correlateQAPairs(pdfFiles);
        console.log(`  Correlated into ${pairs.length} question sets\n`);

        for (const pair of pairs) {
          try {
            const questions = await importPairedFiles(pair, dryRun, append);
            allQuestions.push(...questions);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown';
            console.log(`     Skipped (${msg})`);
          }
        }
      } else {
        // Standard mode: each file contains both questions and solutions
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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
