#!/usr/bin/env node
/**
 * CFA Buddy — Premium Practice Pack Question Import Pipeline
 *
 * Imports questions from CFA Premium Practice Pack PDFs (OCR'd).
 * These PDFs use a DIFFERENT format from the curriculum End of Chapter PDFs.
 *
 * Usage:
 *   npm run import:premium                                    # Import all 4 premium PDFs
 *   npm run import:premium -- --file="path.pdf"               # Import single PDF
 *   npm run import:premium -- --dry-run                       # Preview without saving
 *
 * Expected PDF structure:
 *   SUBJECT_NAME: Practice Pack
 *   Question 1 of N
 *   Question
 *   ... question text ...
 *   A.    Choice A text
 *   B.    Choice B text
 *   C.    Choice C text
 *   ...
 *   SUBJECT_NAME: Practice Pack- Answers
 *   Answer 1 of N
 *   Answer
 *   Solution
 *   A.    Incorrect because...
 *   B.    Correct. ...
 *   C.    Incorrect because...
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { Question } from '../features/question-bank/types';

const require = createRequire(import.meta.url);

// ─── Subject Header Detection ──────────────────────────────────────────────────

/**
 * Keyword-based subject matching rules, ordered from most-specific to least-specific.
 * Each entry maps a keyword (checked via includes on the lowercased text) to a canonical subject name.
 * More specific keywords must come BEFORE less specific ones to avoid false matches.
 * For example, "fixed income" must precede "income", and "portfolio management" must precede "management".
 */
const SUBJECT_KEYWORD_RULES: Array<{ keyword: string; subject: string }> = [
  // Most specific first
  { keyword: 'fixed income', subject: 'Fixed Income' },
  { keyword: 'financial statement analysis', subject: 'Financial Statement Analysis' },
  { keyword: 'equity investments', subject: 'Equity Investments' },
  { keyword: 'ethical and professional standards', subject: 'Ethical and Professional Standards' },
  { keyword: 'alternative investments', subject: 'Alternative Investments' },
  { keyword: 'corporate issuers', subject: 'Corporate Issuers' },
  { keyword: 'portfolio management', subject: 'Portfolio Management' },
  { keyword: 'quantitative methods', subject: 'Quantitative Methods' },
  // Partial/OCR-friendly keywords (less specific)
  { keyword: 'income', subject: 'Fixed Income' },
  { keyword: 'statement', subject: 'Financial Statement Analysis' },
  { keyword: 'fsa', subject: 'Financial Statement Analysis' },
  { keyword: 'financial', subject: 'Financial Statement Analysis' },
  { keyword: 'equity', subject: 'Equity Investments' },
  { keyword: 'ethic', subject: 'Ethical and Professional Standards' },
  { keyword: 'alt invest', subject: 'Alternative Investments' },
  { keyword: 'alternative', subject: 'Alternative Investments' },
  { keyword: 'corporate', subject: 'Corporate Issuers' },
  { keyword: 'issuer', subject: 'Corporate Issuers' },
  { keyword: 'derivative', subject: 'Derivatives' },
  { keyword: 'portfolio', subject: 'Portfolio Management' },
  { keyword: 'management', subject: 'Portfolio Management' },
  { keyword: 'quantitative', subject: 'Quantitative Methods' },
  { keyword: 'quant', subject: 'Quantitative Methods' },
  { keyword: 'econom', subject: 'Economics' },
];

/**
 * Normalize a subject header like "Fixed Income: Practice Pack" into "Fixed Income".
 * Uses lenient partial keyword matching to handle OCR-mangled headers.
 */
export function normalizeSubject(headerText: string): string {
  // Remove the ": Practice Pack" part (and optional "- Answers" suffix)
  const cleaned = headerText
    .replace(/:\s*practice\s*pack\s*-?\s*answers?/i, '')
    .replace(/:\s*practice\s*pack/i, '')
    .trim();

  const lower = cleaned.toLowerCase();

  for (const rule of SUBJECT_KEYWORD_RULES) {
    if (lower.includes(rule.keyword)) {
      return rule.subject;
    }
  }

  // Fallback: capitalize words
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Create a URL-friendly slug from a subject name.
 */
function slugify(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Parsed Types ───────────────────────────────────────────────────────────────

interface PremiumParsedQuestion {
  num: number;
  text: string;
  choices: Array<{ label: string; text: string }>;
}

interface PremiumParsedAnswer {
  num: number;
  correctLabel: string;
  explanations: Array<{ label: string; text: string }>;
}

interface SubjectSection {
  subject: string;
  questionsText: string;
  answersText: string;
}

// ─── Splitting by Subject ───────────────────────────────────────────────────────

/**
 * Split the full PDF text into subject sections.
 * Each section has a questions part and an answers part.
 *
 * Looks for headers like:
 *   "Fixed Income: Practice Pack"  (questions section)
 *   "Fixed Income: Practice Pack- Answers" (answers section)
 */
export function splitBySubject(text: string): SubjectSection[] {
  // Match headers like "Subject Name: Practice Pack" (possibly followed by "- Answers" or "- Answer")
  // The regex captures the full header to determine if it's questions or answers section
  const headerPattern = /^(.+?):\s*Practice\s*Pack\s*(-\s*Answers?)?/gim;

  const headers: Array<{ subject: string; isAnswers: boolean; index: number }> = [];
  let match;
  while ((match = headerPattern.exec(text)) !== null) {
    const rawSubject = match[1].trim();
    const isAnswers = !!match[2];
    headers.push({
      subject: normalizeSubject(rawSubject),
      isAnswers,
      index: match.index,
    });
  }

  if (headers.length === 0) {
    return [];
  }

  // Build sections by pairing questions and answers headers for same subject
  const subjectMap = new Map<string, { questionsStart: number; questionsEnd: number; answersStart: number; answersEnd: number }>();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextStart = i + 1 < headers.length ? headers[i + 1].index : text.length;
    const contentStart = text.indexOf('\n', header.index) + 1;

    if (!subjectMap.has(header.subject)) {
      subjectMap.set(header.subject, { questionsStart: -1, questionsEnd: -1, answersStart: -1, answersEnd: -1 });
    }

    const entry = subjectMap.get(header.subject)!;
    if (header.isAnswers) {
      entry.answersStart = contentStart;
      entry.answersEnd = nextStart;
    } else {
      entry.questionsStart = contentStart;
      entry.questionsEnd = nextStart;
    }
  }

  const sections: SubjectSection[] = [];
  for (const [subject, bounds] of subjectMap) {
    const questionsText = bounds.questionsStart >= 0
      ? text.slice(bounds.questionsStart, bounds.questionsEnd)
      : '';
    const answersText = bounds.answersStart >= 0
      ? text.slice(bounds.answersStart, bounds.answersEnd)
      : '';

    if (questionsText || answersText) {
      sections.push({ subject, questionsText, answersText });
    }
  }

  return sections;
}

// ─── Parse Questions ────────────────────────────────────────────────────────────

/**
 * Normalize an OCR-damaged choice label.
 * Handles: "A," -> "A", "Cc." -> "C", "Cc," -> "C", "B." -> "B"
 */
function normalizeChoiceLabel(raw: string): string {
  const cleaned = raw.replace(/[.,]/g, '').trim().toUpperCase();
  // Handle OCR doubles like "CC" -> "C", "AA" -> "A"
  if (cleaned.length === 2 && cleaned[0] === cleaned[1]) {
    return cleaned[0];
  }
  // Return first character if it's A-D
  if (cleaned.length >= 1 && /^[A-D]/.test(cleaned)) {
    return cleaned[0];
  }
  return cleaned;
}

/**
 * Parse questions from a subject's question text.
 * Questions are separated by "Question X of Y" headers.
 */
export function parsePremiumQuestions(text: string): PremiumParsedQuestion[] {
  if (!text.trim()) return [];

  const questions: PremiumParsedQuestion[] = [];

  // Split by "Question X of Y" pattern
  const questionPattern = /Question\s+(\d+)\s+of\s+\d+/gi;
  const starts: Array<{ num: number; index: number }> = [];

  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    starts.push({ num: parseInt(match[1]), index: match.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const block = text.slice(start.index, end);

    // Remove the "Question X of Y" header line
    const headerEnd = block.indexOf('\n');
    if (headerEnd === -1) continue;
    let content = block.slice(headerEnd + 1).trim();

    // Remove the "Question" sub-header line if present
    const lines = content.split('\n');
    if (lines.length > 0 && /^\s*Question\s*$/i.test(lines[0])) {
      lines.shift();
      content = lines.join('\n').trim();
    }

    // Extract choices using pattern: A. / B. / C. (also handle OCR variants: A, / Cc. / Cc,)
    // Match choice patterns: letter(s) followed by period or comma, then text
    const choicePattern = /(?:^|\n)\s*([A-Da-d]{1,2})[.,]\s+([\s\S]*?)(?=(?:\n\s*[A-Da-d]{1,2}[.,]\s)|$)/g;
    const choices: Array<{ label: string; text: string }> = [];
    let firstChoiceIdx = content.length;

    let cm;
    while ((cm = choicePattern.exec(content)) !== null) {
      if (choices.length === 0) {
        // Find where in content this choice starts
        firstChoiceIdx = content.indexOf(cm[0].trimStart(), cm.index > 10 ? cm.index - 10 : 0);
        if (firstChoiceIdx === -1) firstChoiceIdx = cm.index;
      }
      choices.push({
        label: normalizeChoiceLabel(cm[1]),
        text: cm[2].replace(/\s+/g, ' ').trim(),
      });
    }

    // Extract question text (everything before first choice)
    const questionText = content.slice(0, firstChoiceIdx).replace(/\s+/g, ' ').trim();

    if (questionText.length >= 5 && choices.length >= 2) {
      questions.push({
        num: start.num,
        text: questionText,
        choices,
      });
    }
  }

  return questions;
}

// ─── Parse Answers ──────────────────────────────────────────────────────────────

/**
 * Parse answers from a subject's answer text.
 * Answers are separated by "Answer X of Y" headers.
 * The correct answer is identified by a choice starting with "Correct" (not "Incorrect").
 */
export function parsePremiumAnswers(text: string): PremiumParsedAnswer[] {
  if (!text.trim()) return [];

  const answers: PremiumParsedAnswer[] = [];

  // Split by "Answer X of Y" pattern
  const answerPattern = /Answer\s+(\d+)\s+of\s+\d+/gi;
  const starts: Array<{ num: number; index: number }> = [];

  let match;
  while ((match = answerPattern.exec(text)) !== null) {
    starts.push({ num: parseInt(match[1]), index: match.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const block = text.slice(start.index, end);

    // Remove the "Answer X of Y" header line
    const headerEnd = block.indexOf('\n');
    if (headerEnd === -1) continue;
    let content = block.slice(headerEnd + 1).trim();

    // Remove "Answer" and "Solution" sub-header lines
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    for (const line of lines) {
      if (/^\s*Answer\s*$/i.test(line)) continue;
      if (/^\s*Solution\s*$/i.test(line)) continue;
      filteredLines.push(line);
    }
    content = filteredLines.join('\n').trim();

    // Extract choice explanations (A. / B. / C. with OCR variants)
    const choicePattern = /(?:^|\n)\s*([A-Da-d]{1,2})[.,]\s+([\s\S]*?)(?=(?:\n\s*[A-Da-d]{1,2}[.,]\s)|$)/g;
    const explanations: Array<{ label: string; text: string }> = [];

    let cm;
    while ((cm = choicePattern.exec(content)) !== null) {
      explanations.push({
        label: normalizeChoiceLabel(cm[1]),
        text: cm[2].replace(/\s+/g, ' ').trim(),
      });
    }

    // Find the correct answer: the one whose text starts with "Correct" (not "Incorrect")
    let correctLabel = '';
    for (const exp of explanations) {
      const textLower = exp.text.toLowerCase();
      if (textLower.startsWith('correct') && !textLower.startsWith('incorrect')) {
        correctLabel = exp.label;
        break;
      }
    }

    if (correctLabel) {
      answers.push({
        num: start.num,
        correctLabel,
        explanations,
      });
    }
  }

  return answers;
}

// ─── Build Questions ────────────────────────────────────────────────────────────

/**
 * Create a short slug from a filename (without extension) for use in question IDs.
 * E.g., "OCR_CFA L1 2025_Part2.pdf" -> "ocr-cfa-l1-2025-part2"
 */
function fileSlugFromName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '') // Remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build final Question objects from parsed questions and answers.
 */
function buildPremiumQuestions(
  parsedQuestions: PremiumParsedQuestion[],
  parsedAnswers: PremiumParsedAnswer[],
  subject: string,
  sourceFile: string
): Question[] {
  const answerMap = new Map(parsedAnswers.map(a => [a.num, a]));
  const fileSlug = fileSlugFromName(sourceFile);

  const questions: Question[] = [];

  for (const pq of parsedQuestions) {
    const answer = answerMap.get(pq.num);
    if (!answer) continue; // Skip questions without answers

    const correctLabel = answer.correctLabel;
    const explanationMap = new Map(answer.explanations.map(e => [e.label, e.text]));

    const answerChoices = pq.choices.map(c => ({
      label: c.label,
      text: c.text,
      isCorrect: c.label === correctLabel,
      explanation: explanationMap.get(c.label) || (c.label === correctLabel ? 'Correct answer.' : 'Incorrect.'),
    }));

    // Only include if exactly one correct answer is present
    if (!answerChoices.some(c => c.isCorrect)) continue;

    questions.push({
      id: `premium-${slugify(subject)}-${fileSlug}-q${pq.num}`,
      questionText: pq.text,
      answerChoices,
      difficulty: 'Medium',
      subject,
      reading: null,
      topic: null,
      provider: 'premium-practice',
      questionSourceFile: sourceFile,
    });
  }

  return questions;
}

// ─── Main Import Logic ──────────────────────────────────────────────────────────

async function importPremiumFile(filePath: string, dryRun: boolean): Promise<Question[]> {
  const filename = basename(filePath);
  console.log(`  Processing: ${filename}`);

  const buffer = await readFile(filePath);

  // pdf-parse: use createRequire for CJS compatibility with tsx on Windows
  const { PDFParse } = require('pdf-parse');
  const data = new Uint8Array(buffer);
  const parser = new PDFParse(data);
  await parser.load();
  const result = await parser.getText();
  const text: string = result.text;
  console.log(`     Extracted ${text.length} chars`);

  // Split by subject headers
  const sections = splitBySubject(text);
  console.log(`     Found ${sections.length} subject sections`);

  const allQuestions: Question[] = [];
  const outputDir = join(process.cwd(), 'content', 'metadata', 'imported-questions');

  if (!dryRun) {
    await mkdir(outputDir, { recursive: true });
  }

  for (const section of sections) {
    const questions = parsePremiumQuestions(section.questionsText);
    const answers = parsePremiumAnswers(section.answersText);
    const built = buildPremiumQuestions(questions, answers, section.subject, filename);

    console.log(`     ${section.subject}: ${questions.length} questions, ${answers.length} answers, ${built.length} matched`);

    if (!dryRun && built.length > 0) {
      const outName = `premium-${slugify(section.subject)}.json`;
      const outputFile = join(outputDir, outName);

      // Append to existing file if it exists
      let existing: Question[] = [];
      try {
        const raw = await readFile(outputFile, 'utf-8');
        existing = JSON.parse(raw) as Question[];
      } catch {
        // File doesn't exist yet
      }

      // Deduplicate by ID
      const idSet = new Set(existing.map(q => q.id));
      const newQuestions = built.filter(q => !idSet.has(q.id));
      const merged = [...existing, ...newQuestions];

      await writeFile(outputFile, JSON.stringify(merged, null, 2));
      console.log(`     Saved ${newQuestions.length} new to ${outName} (total: ${merged.length})`);
    }

    allQuestions.push(...built);
  }

  return allQuestions;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  console.log('\n====================================================');
  console.log('  CFA Buddy - Premium Practice Pack Import Pipeline  ');
  console.log('====================================================\n');

  if (dryRun) console.log('  Mode: DRY RUN (no files will be written)\n');

  let allQuestions: Question[] = [];

  try {
    if (fileArg) {
      // Single file mode
      allQuestions = await importPremiumFile(fileArg, dryRun);
    } else {
      // Batch mode: scan for premium PDFs
      const searchDir = join(
        process.cwd(),
        'content',
        'question-banks',
        'level1',
        'CFA L1 2025_Premium Practice Pack Question Pdfs'
      );

      let pdfFiles: string[] = [];
      try {
        const files = await readdir(searchDir);
        pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf')).map(f => join(searchDir, f));
      } catch {
        console.log(`  Directory not found: ${searchDir}`);
        console.log('  Place your premium practice pack PDFs there and run again.\n');
        process.exit(0);
      }

      if (pdfFiles.length === 0) {
        console.log('  No PDF files found in the premium directory.');
        console.log('  Expected OCR_CFA L1 2025_*.pdf files.\n');
        process.exit(0);
      }

      console.log(`  Found ${pdfFiles.length} premium PDF files\n`);

      for (const pdf of pdfFiles.sort()) {
        try {
          const questions = await importPremiumFile(pdf, dryRun);
          allQuestions.push(...questions);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown';
          console.log(`     Skipped (${msg})`);
        }
      }
    }

    // Summary
    console.log('\n  ===========================');
    console.log(`  Total imported: ${allQuestions.length} questions`);
    const subjects = [...new Set(allQuestions.map(q => q.subject))];
    console.log(`  Subjects: ${subjects.join(', ')}`);
    console.log('  ===========================\n');

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  Import failed: ${msg}`);
    process.exit(1);
  }
}

// Only run CLI when executed directly (not when imported for testing)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
