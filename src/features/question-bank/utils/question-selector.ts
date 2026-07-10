import type { Question, TestMode, SessionConfig, QuestionSession } from '../types';

/**
 * CFA Level 1 curriculum weights for Mock Exam mode.
 */
const CFA_CURRICULUM_WEIGHTS: Record<string, number> = {
  'Ethics': 0.15,
  'Quantitative Methods': 0.08,
  'Economics': 0.08,
  'Financial Statement Analysis': 0.13,
  'Corporate Issuers': 0.08,
  'Equity Investments': 0.13,
  'Fixed Income': 0.13,
  'Derivatives': 0.06,
  'Alternative Investments': 0.06,
  'Portfolio Management': 0.10,
};

/**
 * Select questions for a session based on mode and config.
 * This is pure logic - can be tested independently.
 */
export function selectQuestions(
  allQuestions: Question[],
  mode: TestMode,
  config: SessionConfig
): Question[] {
  let pool: Question[] = [...allQuestions];

  // For Mock mode, skip subject filter (always uses all subjects with curriculum weighting)
  if (mode !== 'Mock') {
    // Apply subject filter - supports comma-separated values
    if (config.subject) {
      const subjects = config.subject.split(',').map(s => s.trim());
      pool = pool.filter(q => subjects.includes(q.subject));
    }
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
    case 'Mock':
      return selectMockQuestions(pool, config.questionCount);
    case 'AdaptiveRetest':
      return selectAdaptiveRetestQuestions(pool, config.questionCount);
    case 'WeakTopic':
      return selectWeakTopicQuestions(pool, config.questionCount);
  }

  // Shuffle
  pool = shuffleArray(pool);

  // Limit to requested count
  return pool.slice(0, config.questionCount);
}

/**
 * Select questions weighted by CFA L1 curriculum for Mock Exam mode.
 */
function selectMockQuestions(pool: Question[], totalCount: number): Question[] {
  const targetCount = totalCount || 90;

  // Group pool by subject
  const bySubject: Record<string, Question[]> = {};
  for (const q of pool) {
    if (!bySubject[q.subject]) bySubject[q.subject] = [];
    bySubject[q.subject].push(q);
  }

  // Shuffle each subject pool
  for (const subject of Object.keys(bySubject)) {
    bySubject[subject] = shuffleArray(bySubject[subject]);
  }

  // Calculate initial allocations based on weights
  const subjects = Object.keys(CFA_CURRICULUM_WEIGHTS);
  const allocations: Record<string, number> = {};
  let totalAllocated = 0;

  for (const subject of subjects) {
    const weight = CFA_CURRICULUM_WEIGHTS[subject];
    allocations[subject] = Math.round(weight * targetCount);
    totalAllocated += allocations[subject];
  }

  // Adjust rounding to match exact targetCount
  const diff = targetCount - totalAllocated;
  if (diff !== 0) {
    // Add/remove from the largest weighted subject
    const largestSubject = subjects.reduce((a, b) =>
      CFA_CURRICULUM_WEIGHTS[a] > CFA_CURRICULUM_WEIGHTS[b] ? a : b
    );
    allocations[largestSubject] += diff;
  }

  // Select questions, redistributing shortfall
  const selected: Question[] = [];
  let remainder = 0;
  const subjectsWithAvailability: string[] = [];

  // First pass: take what we can
  for (const subject of subjects) {
    const available = bySubject[subject] || [];
    const target = allocations[subject];
    const take = Math.min(target, available.length);
    selected.push(...available.slice(0, take));
    if (take < target) {
      remainder += target - take;
    } else if (available.length > take) {
      subjectsWithAvailability.push(subject);
    }
  }

  // Second pass: redistribute remainder proportionally among subjects with leftover questions
  if (remainder > 0 && subjectsWithAvailability.length > 0) {
    const alreadyTaken: Record<string, number> = {};
    for (const subject of subjects) {
      const available = bySubject[subject] || [];
      alreadyTaken[subject] = Math.min(allocations[subject], available.length);
    }

    // Calculate total remaining weight for redistribution
    let totalRemainingWeight = 0;
    for (const subject of subjectsWithAvailability) {
      totalRemainingWeight += CFA_CURRICULUM_WEIGHTS[subject];
    }

    for (const subject of subjectsWithAvailability) {
      if (remainder <= 0) break;
      const available = bySubject[subject] || [];
      const alreadyUsed = alreadyTaken[subject];
      const stillAvailable = available.length - alreadyUsed;
      const proportionalShare = Math.round(
        (CFA_CURRICULUM_WEIGHTS[subject] / totalRemainingWeight) * remainder
      );
      const extra = Math.min(proportionalShare, stillAvailable);
      selected.push(...available.slice(alreadyUsed, alreadyUsed + extra));
      remainder -= extra;
    }

    // If still remainder left, greedily fill from any available
    if (remainder > 0) {
      for (const subject of subjectsWithAvailability) {
        if (remainder <= 0) break;
        const available = bySubject[subject] || [];
        const alreadyUsed = selected.filter(q => q.subject === subject).length;
        const stillAvailable = available.length - alreadyUsed;
        const extra = Math.min(remainder, stillAvailable);
        if (extra > 0) {
          selected.push(...available.slice(alreadyUsed, alreadyUsed + extra));
          remainder -= extra;
        }
      }
    }
  }

  // Final shuffle so subjects aren't grouped
  return shuffleArray(selected).slice(0, targetCount);
}

/**
 * AdaptiveRetest: select only previously-wrong questions.
 */
function selectAdaptiveRetestQuestions(pool: Question[], questionCount: number): Question[] {
  const wrongIds = getWrongQuestionIds();

  if (wrongIds.size === 0) {
    // No history, fall back to shuffled pool
    return shuffleArray(pool).slice(0, questionCount);
  }

  // Filter pool to only previously-wrong questions
  const wrongPool = pool.filter(q => wrongIds.has(q.id));

  // If fewer than questionCount, take all available (don't pad)
  return shuffleArray(wrongPool).slice(0, questionCount);
}

/**
 * WeakTopic: select questions from subjects with < 60% accuracy.
 */
function selectWeakTopicQuestions(pool: Question[], questionCount: number): Question[] {
  const subjectAccuracy = getSubjectAccuracy();

  // Find weak subjects (accuracy < 60%)
  const weakSubjects: string[] = [];
  for (const [subject, accuracy] of Object.entries(subjectAccuracy)) {
    if (accuracy < 0.6) {
      weakSubjects.push(subject);
    }
  }

  // If no weak subjects (new user or all >= 60%), fall back to Random
  if (weakSubjects.length === 0) {
    return shuffleArray(pool).slice(0, questionCount);
  }

  // Filter pool to weak subjects only
  const weakPool = pool.filter(q => weakSubjects.includes(q.subject));

  return shuffleArray(weakPool).slice(0, questionCount);
}

/**
 * Read all wrong question IDs from completed sessions in localStorage.
 */
function getWrongQuestionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return new Set();
    const sessions: QuestionSession[] = JSON.parse(raw);
    const wrongIds = new Set<string>();

    for (const session of sessions) {
      if (session.status !== 'completed') continue;
      for (const attempt of session.attempts) {
        if (attempt.correct === false) {
          wrongIds.add(attempt.questionId);
        }
      }
    }

    return wrongIds;
  } catch {
    return new Set();
  }
}

/**
 * Calculate per-subject accuracy from all completed sessions.
 * Returns a map of subject -> accuracy (0-1).
 */
function getSubjectAccuracy(): Record<string, number> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return {};
    const sessions: QuestionSession[] = JSON.parse(raw);

    // We need the question subject for each attempt, but attempts only store questionId.
    // Calculate accuracy per questionId first, then we need subject mapping.
    // Since we don't have questions in this function, we track by questionId
    // and rely on the pool being available at the caller level.
    // Instead, we can read the imported questions from localStorage or just
    // track correct/total per subject from sessions that store subject info.
    //
    // The QuestionAttempt interface only has questionId, not subject.
    // We need to cross-reference with questions. Since we can't access the pool here,
    // we'll use a different approach: read all questions from the API cache in localStorage.
    const questionsRaw = localStorage.getItem('cfa-buddy-imported-questions');
    if (!questionsRaw) return {};

    const allQuestions: Array<{ id: string; subject: string }> = JSON.parse(questionsRaw);
    const questionSubjectMap = new Map<string, string>();
    for (const q of allQuestions) {
      questionSubjectMap.set(q.id, q.subject);
    }

    const subjectStats: Record<string, { correct: number; total: number }> = {};

    for (const session of sessions) {
      if (session.status !== 'completed') continue;
      for (const attempt of session.attempts) {
        const subject = questionSubjectMap.get(attempt.questionId);
        if (!subject) continue;
        if (!subjectStats[subject]) subjectStats[subject] = { correct: 0, total: 0 };
        subjectStats[subject].total++;
        if (attempt.correct) subjectStats[subject].correct++;
      }
    }

    const accuracy: Record<string, number> = {};
    for (const [subject, stats] of Object.entries(subjectStats)) {
      accuracy[subject] = stats.total > 0 ? stats.correct / stats.total : 1;
    }

    return accuracy;
  } catch {
    return {};
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
