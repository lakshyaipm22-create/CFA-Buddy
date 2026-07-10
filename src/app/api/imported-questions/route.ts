import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { Question } from '@/features/question-bank/types';

/**
 * GET /api/imported-questions
 * Serves all imported questions from content/metadata/imported-questions/*.json
 * Filters out questions with no correct answer.
 * Returns empty array gracefully if files don't exist (Vercel deployment).
 */
export async function GET() {
  try {
    const contentBase = process.env.CONTENT_BASE_PATH || './content';
    const importDir = join(process.cwd(), contentBase, 'metadata', 'imported-questions');

    let files: string[];
    try {
      files = await readdir(importDir);
    } catch {
      // Directory doesn't exist (e.g., Vercel deployment without content/)
      return NextResponse.json({ questions: [], count: 0 });
    }

    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      return NextResponse.json({ questions: [], count: 0 });
    }

    const allQuestions: Question[] = [];

    for (const file of jsonFiles.sort()) {
      try {
        const raw = await readFile(join(importDir, file), 'utf-8');
        const questions: Question[] = JSON.parse(raw);
        // Only include questions with at least one correct answer
        const valid = questions.filter(q => q.answerChoices.some(c => c.isCorrect));
        allQuestions.push(...valid);
      } catch {
        // Skip corrupt files
      }
    }

    return NextResponse.json({
      questions: allQuestions,
      count: allQuestions.length,
      subjects: [...new Set(allQuestions.map(q => q.subject))],
    });
  } catch {
    return NextResponse.json({ questions: [], count: 0, error: 'Failed to load questions' });
  }
}
