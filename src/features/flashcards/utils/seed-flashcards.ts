import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import type { Flashcard } from '../types';
import { getFlashcards, saveFlashcards } from './storage';

/**
 * Seeds flashcards from incorrect questions found in PracticeAttempt data.
 * For each incorrectly-answered question, creates a flashcard with the question
 * on the front and the correct answer + explanation on the back.
 * Deduplicates against existing flashcards by id pattern 'fc-{questionId}'.
 */
export function seedFlashcardsFromAttempts(): void {
  const attempts = getAllAttempts();
  if (attempts.length === 0) return;

  // Collect all unique questionIds where the answer was incorrect
  const incorrectIds = new Set<string>();
  for (const attempt of attempts) {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        if (!qa.correct) {
          incorrectIds.add(qa.questionId);
        }
      }
    }
  }

  if (incorrectIds.size === 0) return;

  // Load full question data and build a lookup map
  const allQuestions = loadAllQuestions();
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));

  // Get existing flashcard ids for deduplication
  const existing = getFlashcards();
  const existingIds = new Set(existing.map(fc => fc.id));

  // Build new flashcards for incorrect questions not already in the deck
  const now = new Date().toISOString();
  const newCards: Flashcard[] = [];

  for (const questionId of incorrectIds) {
    const fcId = `fc-${questionId}`;
    if (existingIds.has(fcId)) continue;

    const question = questionMap.get(questionId);
    if (!question) continue;

    const correctAnswer = question.answerChoices.find(c => c.isCorrect);
    if (!correctAnswer) continue;

    const back = `${correctAnswer.label}. ${correctAnswer.text}\n\n${correctAnswer.explanation}`;

    newCards.push({
      id: fcId,
      front: question.questionText,
      back,
      subject: question.subject,
      topic: question.topic,
      state: 'new',
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: now,
      lastReview: null,
      createdAt: now,
    });
  }

  if (newCards.length === 0) return;

  // Merge and save
  saveFlashcards([...existing, ...newCards]);
}
