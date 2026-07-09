/**
 * Question Parser — Extracts structured questions from raw text.
 * 
 * Detects question boundaries, answer choices, and explanations
 * using regex patterns common across CFA question bank PDFs.
 */

export interface ParsedQuestion {
  questionNumber: number;
  text: string;
  choices: Array<{ label: string; text: string }>;
  correctAnswer?: string;
  explanation?: string;
}

/**
 * Parse raw text into structured questions.
 * Handles multiple question formats:
 * - "1. Question text\nA. Choice\nB. Choice\nC. Choice"
 * - "Q1. Question text"
 * - "Question 1 Question text"
 */
export function parseQuestions(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // Split text into question blocks
  // Pattern: number followed by period or parenthesis at start of line
  const questionPattern = /(?:^|\n)\s*(\d+)\s*[.)]\s*/g;
  const splits: Array<{ num: number; startIdx: number }> = [];
  
  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    splits.push({ num: parseInt(match[1]), startIdx: match.index });
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].startIdx;
    const end = i + 1 < splits.length ? splits[i + 1].startIdx : text.length;
    const block = text.slice(start, end).trim();

    const parsed = parseQuestionBlock(block, splits[i].num);
    if (parsed && parsed.choices.length >= 2) {
      questions.push(parsed);
    }
  }

  return questions;
}

/**
 * Parse a single question block into structured data.
 */
function parseQuestionBlock(block: string, questionNumber: number): ParsedQuestion | null {
  // Remove the question number prefix
  const cleaned = block.replace(/^\s*\d+\s*[.)]\s*/, '').trim();

  // Find answer choices (A., B., C. or A), B), C))
  const choicePattern = /(?:^|\n)\s*([A-D])\s*[.)]\s*([\s\S]*?)(?=(?:\n\s*[A-D]\s*[.)])|$)/g;
  const choices: Array<{ label: string; text: string }> = [];
  let lastChoiceEnd = 0;

  let choiceMatch;
  while ((choiceMatch = choicePattern.exec(cleaned)) !== null) {
    if (choices.length === 0) {
      lastChoiceEnd = choiceMatch.index;
    }
    choices.push({
      label: choiceMatch[1],
      text: choiceMatch[2].trim().replace(/\n/g, ' ').trim(),
    });
  }

  if (choices.length < 2) return null;

  // Question text is everything before the first choice
  const questionText = cleaned.slice(0, lastChoiceEnd).trim().replace(/\n/g, ' ');

  if (!questionText || questionText.length < 10) return null;

  return {
    questionNumber,
    text: questionText,
    choices,
  };
}

/**
 * Parse answer/explanation text and match to question numbers.
 * Handles formats like:
 * "1. A is correct. Explanation..."
 * "1. Correct Answer: A"
 */
export function parseAnswers(text: string): Map<number, { correctAnswer: string; explanation: string }> {
  const answers = new Map<number, { correctAnswer: string; explanation: string }>();

  // Pattern: number followed by answer info
  const answerPattern = /(?:^|\n)\s*(\d+)\s*[.)]\s*([\s\S]*?)(?=(?:\n\s*\d+\s*[.)])|$)/g;

  let match;
  while ((match = answerPattern.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const content = match[2].trim();

    // Try to extract correct answer letter
    const correctMatch = content.match(/^([A-D])\s+(?:is\s+)?correct/i)
      ?? content.match(/correct\s+(?:answer[:\s]*)?([A-D])/i)
      ?? content.match(/^([A-D])\s*[.]/);

    const correctAnswer = correctMatch?.[1] ?? '';
    const explanation = content.replace(/^[A-D]\s*(?:is\s+)?correct[.!]?\s*/i, '').trim();

    if (correctAnswer) {
      answers.set(num, { correctAnswer, explanation });
    }
  }

  return answers;
}

/**
 * Merge questions with their answers.
 */
export function mergeQuestionsAndAnswers(
  questions: ParsedQuestion[],
  answers: Map<number, { correctAnswer: string; explanation: string }>
): ParsedQuestion[] {
  return questions.map(q => {
    const answer = answers.get(q.questionNumber);
    if (answer) {
      return {
        ...q,
        correctAnswer: answer.correctAnswer,
        explanation: answer.explanation,
      };
    }
    return q;
  });
}
