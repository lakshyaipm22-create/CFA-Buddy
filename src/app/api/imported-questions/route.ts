import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
        // Infer subject from filename for any question with subject === 'Unknown'
        const inferred = inferSubject(file);
        const enriched = parsed.map((q: unknown) => {
          if (q && typeof q === 'object' && 'subject' in q && (q as { subject: string }).subject === 'Unknown') {
            return { ...q, subject: inferred };
          }
          return q;
        });
        allQuestions.push(...enriched);
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
