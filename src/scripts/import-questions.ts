#!/usr/bin/env node
/**
 * CFA Buddy — Question Import Pipeline
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import { parseQuestions, parseAnswers, mergeQuestionsAndAnswers } from '../features/question-bank/utils/question-parser';

// pdf-parse: CJS package, must use require() for compatibility with tsx
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
  const answersArg = args.find(a => a.startsWith('--answers='))?.split('=')[1];
  const subject = args.find(a => a.startsWith('--subject='))?.split('=')[1] ?? 'Unknown';
  const provider = args.find(a => a.startsWith('--provider='))?.split('=')[1] ?? 'unknown';

  if (!fileArg) {
    console.error('Usage: npm run import:questions -- --file="path/to/questions.pdf"');
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  CFA Buddy — Question Import         ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`  Source: ${fileArg}`);
  if (answersArg) console.log(`  Answers: ${answersArg}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Provider: ${provider}`);
  console.log('');

  try {
    // Extract text from PDF
    console.log('  Extracting text from PDF...');
    const fileBuffer = await readFile(fileArg);
    const { text: questionText } = await pdfParse(fileBuffer);
    console.log(`  Extracted ${questionText.length} characters`);

    // Parse questions
    console.log('  Parsing questions...');
    let questions = parseQuestions(questionText);
    console.log(`  Found ${questions.length} questions`);

    // Parse answers if provided
    if (answersArg) {
      console.log('  Extracting answers...');
      const answerBuffer = await readFile(answersArg);
      const { text: answerText } = await pdfParse(answerBuffer);
      const answers = parseAnswers(answerText);
      console.log(`  Found ${answers.size} answers`);

      questions = mergeQuestionsAndAnswers(questions, answers);
      const matched = questions.filter(q => q.correctAnswer).length;
      console.log(`  Matched ${matched}/${questions.length} questions with answers`);
    }

    // Convert to the Question format expected by the app
    const importedQuestions = questions.map((q, idx) => ({
      id: `imported-${basename(fileArg, '.pdf')}-${idx + 1}`,
      questionText: q.text,
      answerChoices: q.choices.map(c => ({
        label: c.label,
        text: c.text,
        isCorrect: c.label === q.correctAnswer,
        explanation: c.label === q.correctAnswer ? (q.explanation ?? '') : '',
      })),
      difficulty: 'Medium' as const,
      subject,
      reading: null,
      topic: null,
      provider,
      questionSourceFile: basename(fileArg),
    }));

    // Write to output file
    const outputDir = join(process.cwd(), 'content', 'metadata', 'imported-questions');
    await mkdir(outputDir, { recursive: true });
    const outputFile = join(outputDir, `${basename(fileArg, '.pdf')}.json`);
    await writeFile(outputFile, JSON.stringify(importedQuestions, null, 2));

    console.log(`\n  ✅ Imported ${importedQuestions.length} questions`);
    console.log(`  Output: ${outputFile}`);

    // Summary
    const withAnswers = importedQuestions.filter(q => q.answerChoices.some(c => c.isCorrect)).length;
    console.log(`\n  Summary:`);
    console.log(`    Total questions: ${importedQuestions.length}`);
    console.log(`    With correct answers: ${withAnswers}`);
    console.log(`    Without answers: ${importedQuestions.length - withAnswers}`);
    console.log('');

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Import failed: ${msg}`);
    process.exit(1);
  }
}

main();
