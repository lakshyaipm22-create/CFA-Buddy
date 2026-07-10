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
  { keyword: 'onomic', subject: 'Economics' },
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
 * Find all "Practice Pack" positions in the text using a position-based approach.
 * This handles OCR line-broken headers where subject names span multiple lines.
 *
 * For each occurrence of "Practice" followed by whitespace/newlines followed by "Pack":
 * 1. Optionally followed by whitespace + "-" + whitespace/newlines + "Answers" (answers section)
 * 2. Look backwards up to 100 chars to find the ":" separator
 * 3. From the colon, look backwards up to 60 chars to capture the full subject name
 * 4. Join newlines in the captured subject name into spaces
 * 5. Normalize via normalizeSubject()
 */
function findPracticePackHeaders(text: string): Array<{ subject: string; isAnswers: boolean; headerStart: number; contentStart: number }> {
  // Match "Practice" followed by whitespace (including newlines) followed by "Pack"
  // Optionally followed by whitespace/dash/newlines + "Answer(s)" or "Question(s)"
  const ppPattern = /Practice\s+Pack(?:\s*-\s*(?:Answers?|Questions?))?/gi;

  const headers: Array<{ subject: string; isAnswers: boolean; headerStart: number; contentStart: number }> = [];
  let match;

  while ((match = ppPattern.exec(text)) !== null) {
    const ppStart = match.index;
    const ppMatchText = match[0];
    const isAnswers = /answers?/i.test(ppMatchText);

    // Look backwards from "Practice" to find the ":" separator (up to 100 chars back)
    const lookbackStart = Math.max(0, ppStart - 100);
    const beforePractice = text.slice(lookbackStart, ppStart);
    const colonIdx = beforePractice.lastIndexOf(':');

    if (colonIdx === -1) {
      // No colon found - skip this match (not a valid subject header)
      continue;
    }

    // Get the absolute position of the colon
    const absoluteColonIdx = lookbackStart + colonIdx;

    // Look backwards from the colon (up to 60 chars) to capture the full subject name
    const subjectLookbackStart = Math.max(0, absoluteColonIdx - 60);
    const beforeColon = text.slice(subjectLookbackStart, absoluteColonIdx);

    // Take the subject text: split by double newlines (paragraph break) and take the last chunk,
    // then join single newlines with spaces
    const paragraphs = beforeColon.split(/\n\s*\n/);
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const subjectRaw = lastParagraph
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ')
      .trim();

    if (!subjectRaw) continue;

    const subject = normalizeSubject(subjectRaw);

    // Determine the header start (the beginning of the subject text before the colon)
    // Use the start of the last paragraph as the header start
    const lastParagraphOffset = beforeColon.lastIndexOf(lastParagraph.trimStart().split('\n')[0].trim());
    const headerStart = lastParagraphOffset >= 0 ? subjectLookbackStart + lastParagraphOffset : absoluteColonIdx;

    // Content starts after the end of the "Practice Pack..." match line
    const matchEnd = ppStart + ppMatchText.length;
    const nextNewline = text.indexOf('\n', matchEnd);
    const contentStart = nextNewline >= 0 ? nextNewline + 1 : matchEnd;

    headers.push({
      subject,
      isAnswers,
      headerStart,
      contentStart,
    });
  }

  return headers;
}

/**
 * Filename-based subject keyword mapping for fallback inference.
 * Maps a keyword found in the filename to the canonical subject name.
 */
const FILENAME_SUBJECT_MAP: Array<{ keyword: string; subject: string }> = [
  { keyword: 'fsa', subject: 'Financial Statement Analysis' },
  { keyword: 'fixed income', subject: 'Fixed Income' },
  { keyword: 'quants', subject: 'Quantitative Methods' },
  { keyword: 'portfolio', subject: 'Portfolio Management' },
  { keyword: 'equity', subject: 'Equity Investments' },
  { keyword: 'ethics', subject: 'Ethical and Professional Standards' },
  { keyword: 'alt investments', subject: 'Alternative Investments' },
  { keyword: 'corp', subject: 'Corporate Issuers' },
  { keyword: 'derivatives', subject: 'Derivatives' },
  { keyword: 'economics', subject: 'Economics' },
];

/**
 * Infer all subject names mentioned in the filename, returned in order of their
 * position within the filename string (leftmost keyword match first).
 */
function inferSubjectsFromFilename(filename: string): string[] {
  const lower = filename.toLowerCase();
  const found: Array<{ subject: string; position: number }> = [];
  for (const entry of FILENAME_SUBJECT_MAP) {
    const idx = lower.indexOf(entry.keyword);
    if (idx >= 0) {
      found.push({ subject: entry.subject, position: idx });
    }
  }
  // Sort by position in filename so the first-mentioned subject comes first
  found.sort((a, b) => a.position - b.position);
  return found.map(f => f.subject);
}

/**
 * Count the number of distinct "Question 1 of X" restarts in the text.
 * Each "Question 1 of X" signals the beginning of a new question section.
 * Returns the positions and totals of each restart.
 */
function findQuestionRestarts(text: string): Array<{ position: number; total: number }> {
  const pattern = /Question\s+1\s+of\s+(\d+)/gi;
  const restarts: Array<{ position: number; total: number }> = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    restarts.push({ position: match.index, total: parseInt(match[1]) });
  }
  return restarts;
}

/**
 * Find all "Answer 1 of X" restarts in the text.
 * Each signals the beginning of a new answer section.
 */
function findAnswerRestarts(text: string): Array<{ position: number; total: number }> {
  const pattern = /Answer\s+1\s+of\s+(\d+)/gi;
  const restarts: Array<{ position: number; total: number }> = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    restarts.push({ position: match.index, total: parseInt(match[1]) });
  }
  return restarts;
}

/**
 * Fallback section detection using "Question 1 of X" restarts.
 *
 * When OCR completely mangles headers (e.g., "Practice Pack" becomes "Practiea Pad"),
 * the header-based approach fails. This fallback uses the perfectly-preserved
 * "Question 1 of X" and "Answer 1 of X" patterns to detect section boundaries.
 *
 * It pairs question sections with answer sections by matching total counts (the X value),
 * then infers subject names using the filename and any subjects found by the header approach.
 */
function fallbackSplitBySubject(
  text: string,
  headerSections: SubjectSection[],
  filename: string
): SubjectSection[] {
  const questionRestarts = findQuestionRestarts(text);
  const answerRestarts = findAnswerRestarts(text);

  if (questionRestarts.length === 0) return headerSections;

  // Collect all section boundary positions
  const allBoundaries: number[] = [
    ...questionRestarts.map(r => r.position),
    ...answerRestarts.map(r => r.position),
  ].sort((a, b) => a - b);

  // For each question restart, find its end (next boundary after it)
  const questionRanges: Array<{ total: number; start: number; end: number }> = [];
  for (const qr of questionRestarts) {
    const nextBoundary = allBoundaries.find(b => b > qr.position);
    const end = nextBoundary ?? text.length;
    questionRanges.push({ total: qr.total, start: qr.position, end });
  }

  // Same for answer ranges
  const answerRanges: Array<{ total: number; start: number; end: number }> = [];
  for (const ar of answerRestarts) {
    const nextBoundary = allBoundaries.find(b => b > ar.position);
    const end = nextBoundary ?? text.length;
    answerRanges.push({ total: ar.total, start: ar.position, end });
  }

  // Determine which totals are already claimed by header-based sections.
  // A header-based section "claims" a total if its questionsText contains "Question 1 of TOTAL"
  const claimedTotals = new Map<number, string>(); // total -> subject name
  for (const section of headerSections) {
    const q1Pattern = /Question\s+1\s+of\s+(\d+)/i;
    const q1Match = q1Pattern.exec(section.questionsText);
    if (q1Match) {
      claimedTotals.set(parseInt(q1Match[1]), section.subject);
    }
  }

  // Determine subjects from the filename for unclaimed totals
  const filenameSubjects = inferSubjectsFromFilename(filename);
  const claimedSubjectNames = new Set(claimedTotals.values());

  // Find subjects from filename that are NOT already claimed
  const unclaimedFilenameSubjects = filenameSubjects.filter(s => !claimedSubjectNames.has(s));

  // Pair question ranges with answer ranges by matching totals
  const sections: SubjectSection[] = [];
  let unclaimedIdx = 0;

  for (const qRange of questionRanges) {
    const questionsText = text.slice(qRange.start, qRange.end);

    // Find the matching answer range by total
    const matchingAnswerRange = answerRanges.find(ar => ar.total === qRange.total);
    const answersText = matchingAnswerRange
      ? text.slice(matchingAnswerRange.start, matchingAnswerRange.end)
      : '';

    // Determine subject name
    let subject: string;
    if (claimedTotals.has(qRange.total)) {
      // This total was already identified by the header-based approach
      subject = claimedTotals.get(qRange.total)!;
    } else if (unclaimedIdx < unclaimedFilenameSubjects.length) {
      // Assign the next unclaimed subject from the filename
      subject = unclaimedFilenameSubjects[unclaimedIdx];
      unclaimedIdx++;
    } else {
      // Last resort: use "Unknown Subject"
      subject = 'Unknown Subject';
    }

    sections.push({ subject, questionsText, answersText });
  }

  return sections;
}

/**
 * Split the full PDF text into subject sections.
 * Each section has a questions part and an answers part.
 *
 * Uses a position-based approach to handle OCR line-broken headers like:
 *   "Fixed\nIncome:\nPractice\nPack"
 *   "Financial\nStatement\nAnalysis:\nPractice\nPack"
 *
 * If the header-based approach finds fewer sections than "Question 1 of X" restarts suggest,
 * a fallback method uses those restarts to detect section boundaries and infers
 * subject names from the filename.
 */
export function splitBySubject(text: string, filename = ''): SubjectSection[] {
  const headers = findPracticePackHeaders(text);

  if (headers.length === 0) {
    // No headers found at all - use fallback if we have question restarts
    const questionRestarts = findQuestionRestarts(text);
    if (questionRestarts.length > 0) {
      return fallbackSplitBySubject(text, [], filename);
    }
    return [];
  }

  // Sort by headerStart position to determine content boundaries
  headers.sort((a, b) => a.headerStart - b.headerStart);

  // Build sections by pairing questions and answers headers for same subject
  const subjectMap = new Map<string, { questionsStart: number; questionsEnd: number; answersStart: number; answersEnd: number }>();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextStart = i + 1 < headers.length ? headers[i + 1].headerStart : text.length;

    if (!subjectMap.has(header.subject)) {
      subjectMap.set(header.subject, { questionsStart: -1, questionsEnd: -1, answersStart: -1, answersEnd: -1 });
    }

    const entry = subjectMap.get(header.subject)!;
    if (header.isAnswers) {
      entry.answersStart = header.contentStart;
      entry.answersEnd = nextStart;
    } else {
      entry.questionsStart = header.contentStart;
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

  // Check if fallback is needed: compare number of header-detected sections
  // vs number of "Question 1 of X" restarts in the full text
  const questionRestarts = findQuestionRestarts(text);
  if (questionRestarts.length > sections.length) {
    // Header-based approach missed some sections - activate fallback
    return fallbackSplitBySubject(text, sections, filename);
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

async function importPremiumFile(filePath: string, dryRun: boolean, debug = false): Promise<Question[]> {
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

  if (debug) {
    console.log('\n  [DEBUG] First 3000 chars of extracted text:');
    console.log(text.slice(0, 3000));
    console.log('\n  [DEBUG] All headers found by position-based parser:');
    const debugHeaders = findPracticePackHeaders(text);
    for (const h of debugHeaders) {
      console.log(`    headerStart=${h.headerStart} contentStart=${h.contentStart} subject="${h.subject}" isAnswers=${h.isAnswers}`);
    }
  }

  // Split by subject headers (pass filename for fallback inference)
  const sections = splitBySubject(text, filename);
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
  const debug = args.includes('--debug');

  console.log('\n====================================================');
  console.log('  CFA Buddy - Premium Practice Pack Import Pipeline  ');
  console.log('====================================================\n');

  if (dryRun) console.log('  Mode: DRY RUN (no files will be written)\n');
  if (debug) console.log('  Mode: DEBUG (verbose output enabled)\n');

  let allQuestions: Question[] = [];

  try {
    if (fileArg) {
      // Single file mode
      allQuestions = await importPremiumFile(fileArg, dryRun, debug);
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
          const questions = await importPremiumFile(pdf, dryRun, debug);
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
