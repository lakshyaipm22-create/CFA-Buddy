import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dir = path.join(process.cwd(), 'content/metadata/imported-questions');

  // If the directory doesn't exist, return empty array (graceful handling for Vercel deployment)
  if (!fs.existsSync(dir)) {
    return NextResponse.json([]);
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const allQuestions: unknown[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        allQuestions.push(...parsed);
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  // Filter out any question where NO answerChoice has isCorrect === true
  const validQuestions = allQuestions.filter((q: unknown) => {
    if (!q || typeof q !== 'object') return false;
    const question = q as { answerChoices?: { isCorrect?: boolean }[] };
    if (!Array.isArray(question.answerChoices)) return false;
    return question.answerChoices.some(choice => choice.isCorrect === true);
  });

  return NextResponse.json(validQuestions);
}
