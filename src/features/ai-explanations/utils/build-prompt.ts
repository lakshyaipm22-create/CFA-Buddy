import type { ExplainRequest } from '../types';

/**
 * Builds the system and user prompts for the AI explanation request.
 */
export function buildExplanationPrompt(request: ExplainRequest): {
  system: string;
  user: string;
} {
  const choicesText = request.answerChoices
    .map(c => `  ${c.label}. ${c.text}${c.isCorrect ? ' (correct)' : ''}`)
    .join('\n');

  const system = `You are a CFA exam tutor. When a student gets a question wrong, explain:
1. Why their selected answer is incorrect
2. Why the correct answer is right
3. The key concept or formula needed
4. A brief tip to remember this for the exam

Keep explanations concise (3-5 paragraphs), use plain language, and focus on exam-relevant understanding.`;

  const user = `The student answered this CFA exam question incorrectly.

Question: ${request.questionText}

Answer choices:
${choicesText}

Student selected: ${request.selectedAnswer}
Correct answer: ${request.correctAnswer}

Please explain why the correct answer is right and help the student understand the concept.`;

  return { system, user };
}
