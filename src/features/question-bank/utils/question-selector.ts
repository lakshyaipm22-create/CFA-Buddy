import type { Question, TestMode, SessionConfig } from '../types';

/**
 * Select questions for a session based on mode and config.
 * This is pure logic — can be tested independently.
 */
export function selectQuestions(
  allQuestions: Question[],
  mode: TestMode,
  config: SessionConfig
): Question[] {
  let pool: Question[] = [...allQuestions];

  // Apply filters from config
  if (config.subject) {
    pool = pool.filter(q => q.subject === config.subject);
  }
  if (config.topic) {
    pool = pool.filter(q => q.topic === config.topic);
  }
  if (config.difficulty) {
    pool = pool.filter(q => q.difficulty === config.difficulty);
  }
  if (config.provider) {
    pool = pool.filter(q => q.provider === config.provider);
  }

  // Mode-specific selection
  switch (mode) {
    case 'Topic':
    case 'QuickTopic':
      // Already filtered by topic/subject above
      break;
    case 'Subject':
      // Already filtered by subject above
      break;
    case 'Mixed':
    case 'Random':
      // Use full pool (with any applied filters)
      break;
    case 'AdaptiveRetest':
    case 'WeakTopic':
      // These need attempt history — will be implemented when DB is connected
      // For now, just use the filtered pool
      break;
  }

  // Shuffle
  pool = shuffleArray(pool);

  // Limit to requested count
  return pool.slice(0, config.questionCount);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
