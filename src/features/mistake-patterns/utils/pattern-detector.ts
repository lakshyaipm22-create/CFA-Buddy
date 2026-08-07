/**
 * Pattern Detector - Identifies specific mistake patterns from practice data.
 * Goes beyond "you scored 60% in FSA" to identify actionable patterns like
 * "You miss 73% of LIFO/FIFO questions when framed as ratio impacts".
 */

import type { PracticeAttempt, AttemptQuestion } from '@/features/question-bank/types/attempt';
import type { Question } from '@/features/question-bank/types';
import type { MistakePattern, PatternSeverity, QuestionExample } from '../types';

interface QuestionAttemptWithContext {
  attempt: AttemptQuestion;
  question: Question;
}

/**
 * Run all pattern detectors and return combined results.
 */
export function detectAllPatterns(
  attempts: PracticeAttempt[],
  questions: Question[]
): MistakePattern[] {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  // Flatten all question attempts with context
  const allAttempts: QuestionAttemptWithContext[] = [];
  for (const practice of attempts) {
    for (const mod of practice.moduleResults) {
      for (const qa of mod.questionAttempts) {
        const question = questionMap.get(qa.questionId);
        if (question) {
          allAttempts.push({ attempt: qa, question });
        }
      }
    }
  }

  if (allAttempts.length === 0) return [];

  const patterns: MistakePattern[] = [
    ...detectConceptConfusion(allAttempts),
    ...detectTimePressureErrors(allAttempts),
    ...detectCalculationErrors(allAttempts, questionMap),
    ...detectConfidenceMismatch(allAttempts),
    ...detectFramingTraps(allAttempts),
  ];

  // Sort by severity then occurrence count
  const severityOrder: Record<PatternSeverity, number> = { high: 0, medium: 1, low: 2 };
  patterns.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.occurrenceCount - a.occurrenceCount;
  });

  return patterns;
}

/**
 * Detect concept confusion: student gets Topic A right but consistently misses Topic B
 * within the same subject, suggesting they confuse related concepts.
 */
export function detectConceptConfusion(
  allAttempts: QuestionAttemptWithContext[]
): MistakePattern[] {
  // Group by subject -> topic -> correct/incorrect counts
  const subjectTopics = new Map<string, Map<string, { correct: number; incorrect: number; examples: QuestionAttemptWithContext[] }>>();

  for (const item of allAttempts) {
    const subject = item.question.subject;
    const topic = item.question.topic || subject;

    if (!subjectTopics.has(subject)) {
      subjectTopics.set(subject, new Map());
    }
    const topics = subjectTopics.get(subject)!;
    if (!topics.has(topic)) {
      topics.set(topic, { correct: 0, incorrect: 0, examples: [] });
    }
    const stats = topics.get(topic)!;
    if (item.attempt.correct) {
      stats.correct++;
    } else {
      stats.incorrect++;
      stats.examples.push(item);
    }
  }

  const patterns: MistakePattern[] = [];

  // For each subject, find topic pairs where one is strong (>= 70%) and the other is weak (<= 40%)
  for (const [subject, topics] of subjectTopics) {
    const topicEntries = Array.from(topics.entries()).filter(
      ([, stats]) => stats.correct + stats.incorrect >= 3
    );

    for (let i = 0; i < topicEntries.length; i++) {
      const [topicA, statsA] = topicEntries[i];
      const accuracyA = statsA.correct / (statsA.correct + statsA.incorrect);

      for (let j = i + 1; j < topicEntries.length; j++) {
        const [topicB, statsB] = topicEntries[j];
        const accuracyB = statsB.correct / (statsB.correct + statsB.incorrect);

        // One strong (>= 70%), one weak (<= 40%) indicates confusion between related concepts
        const strongWeak =
          (accuracyA >= 0.7 && accuracyB <= 0.4) || (accuracyB >= 0.7 && accuracyA <= 0.4);

        if (strongWeak) {
          const weakTopic = accuracyA < accuracyB ? topicA : topicB;
          const strongTopic = accuracyA < accuracyB ? topicB : topicA;
          const weakStats = accuracyA < accuracyB ? statsA : statsB;
          const weakAccuracy = Math.min(accuracyA, accuracyB);

          const examples = weakStats.examples.slice(0, 3).map((item) =>
            buildExample(item)
          );

          const errorPct = Math.round((1 - weakAccuracy) * 100);

          patterns.push({
            id: `concept-confusion-${subject}-${weakTopic}-${strongTopic}`.replace(/\s+/g, '-').toLowerCase(),
            patternType: 'conceptConfusion',
            description: `You score well on "${strongTopic}" but miss ${errorPct}% of "${weakTopic}" questions in ${subject}, suggesting concept confusion between these related topics.`,
            affectedTopics: [weakTopic, strongTopic],
            occurrenceCount: weakStats.incorrect,
            examples,
            severity: computeSeverity(weakStats.incorrect, errorPct),
            recommendation: `Review how "${weakTopic}" differs from "${strongTopic}". Create comparison notes highlighting the distinctions.`,
            percentage: errorPct,
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect time pressure errors: wrong answers that correlate with very short
 * time spent (< 30 seconds), indicating rushing rather than lack of knowledge.
 */
export function detectTimePressureErrors(
  allAttempts: QuestionAttemptWithContext[]
): MistakePattern[] {
  const TIME_THRESHOLD = 30; // seconds

  const fastWrong = allAttempts.filter(
    (item) => !item.attempt.correct && item.attempt.timeSpentSeconds < TIME_THRESHOLD
  );
  const fastTotal = allAttempts.filter(
    (item) => item.attempt.timeSpentSeconds < TIME_THRESHOLD
  );
  const slowWrong = allAttempts.filter(
    (item) => !item.attempt.correct && item.attempt.timeSpentSeconds >= TIME_THRESHOLD
  );
  const slowTotal = allAttempts.filter(
    (item) => item.attempt.timeSpentSeconds >= TIME_THRESHOLD
  );

  if (fastTotal.length < 3 || slowTotal.length < 3) return [];

  const fastErrorRate = fastWrong.length / fastTotal.length;
  const slowErrorRate = slowTotal.length > 0 ? slowWrong.length / slowTotal.length : 0;

  // Only report if fast error rate is meaningfully higher (at least 1.5x)
  // If slow error rate is 0, any fast errors are significant
  const ratio = slowErrorRate > 0 ? fastErrorRate / slowErrorRate : (fastErrorRate > 0 ? Infinity : 0);
  if (ratio < 1.5) return [];

  // Group fast errors by topic to find most affected
  const topicCounts = new Map<string, number>();
  for (const item of fastWrong) {
    const topic = item.question.topic || item.question.subject;
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }
  const affectedTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const examples = fastWrong.slice(0, 3).map(buildExample);
  const pct = Math.round(fastErrorRate * 100);
  const ratioDisplay = isFinite(ratio) ? `${Math.round(ratio * 10) / 10}x` : 'significantly';

  return [{
    id: 'time-pressure-errors',
    patternType: 'timePressure',
    description: `Your error rate is ${ratioDisplay} higher on questions answered in under ${TIME_THRESHOLD} seconds (${pct}% error rate vs ${Math.round(slowErrorRate * 100)}% when taking more time).`,
    affectedTopics,
    occurrenceCount: fastWrong.length,
    examples,
    severity: computeSeverity(fastWrong.length, pct),
    recommendation: `Slow down on questions where you feel uncertain. Your accuracy improves significantly when you spend more than 30 seconds thinking through the answer.`,
    percentage: pct,
  }];
}

/**
 * Detect calculation errors: wrong answers where the selected answer is adjacent
 * to the correct answer (e.g., selected B when correct was C), suggesting a
 * math mistake rather than a conceptual gap.
 */
export function detectCalculationErrors(
  allAttempts: QuestionAttemptWithContext[],
  questionMap: Map<string, Question>
): MistakePattern[] {
  const adjacentErrors: QuestionAttemptWithContext[] = [];
  const allIncorrect = allAttempts.filter((item) => !item.attempt.correct);

  for (const item of allIncorrect) {
    const question = questionMap.get(item.attempt.questionId);
    if (!question) continue;

    const labels = question.answerChoices.map((c) => c.label);
    const selectedIdx = labels.indexOf(item.attempt.selectedAnswer);
    const correctChoice = question.answerChoices.find((c) => c.isCorrect);
    if (!correctChoice) continue;
    const correctIdx = labels.indexOf(correctChoice.label);

    // Adjacent means exactly one position apart (A-B, B-C, C-D)
    if (selectedIdx >= 0 && correctIdx >= 0 && Math.abs(selectedIdx - correctIdx) === 1) {
      adjacentErrors.push(item);
    }
  }

  if (adjacentErrors.length < 3) return [];

  const adjacentRate = allIncorrect.length > 0
    ? adjacentErrors.length / allIncorrect.length
    : 0;

  // Only flag if at least 30% of errors are adjacent-answer selections
  if (adjacentRate < 0.3) return [];

  // Group by topic
  const topicCounts = new Map<string, number>();
  for (const item of adjacentErrors) {
    const topic = item.question.topic || item.question.subject;
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }
  const affectedTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const examples = adjacentErrors.slice(0, 3).map(buildExample);
  const pct = Math.round(adjacentRate * 100);

  return [{
    id: 'calculation-errors',
    patternType: 'calculationError',
    description: `${pct}% of your wrong answers are the option immediately adjacent to the correct answer, indicating calculation or rounding errors rather than conceptual misunderstandings.`,
    affectedTopics,
    occurrenceCount: adjacentErrors.length,
    examples,
    severity: computeSeverity(adjacentErrors.length, pct),
    recommendation: `Double-check your arithmetic on quantitative questions. Write out intermediate steps and verify final calculations before selecting an answer.`,
    percentage: pct,
  }];
}

/**
 * Detect confidence mismatch: high confidence + wrong answer indicates
 * a misconception (the student thinks they know it but is incorrect).
 */
export function detectConfidenceMismatch(
  allAttempts: QuestionAttemptWithContext[]
): MistakePattern[] {
  const highConfWrong = allAttempts.filter(
    (item) => !item.attempt.correct && item.attempt.confidence === 'High'
  );
  const highConfTotal = allAttempts.filter(
    (item) => item.attempt.confidence === 'High'
  );

  if (highConfTotal.length < 3) return [];

  const mismatchRate = highConfWrong.length / highConfTotal.length;

  // Only flag if at least 20% of high-confidence answers are wrong
  if (mismatchRate < 0.2) return [];

  // Group by topic to find misconception areas
  const topicCounts = new Map<string, number>();
  for (const item of highConfWrong) {
    const topic = item.question.topic || item.question.subject;
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }
  const affectedTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const examples = highConfWrong.slice(0, 3).map(buildExample);
  const pct = Math.round(mismatchRate * 100);

  return [{
    id: 'confidence-mismatch',
    patternType: 'confidenceMismatch',
    description: `You marked "High" confidence on ${highConfTotal.length} questions but got ${highConfWrong.length} wrong (${pct}% mismatch rate), indicating potential misconceptions in ${affectedTopics[0] || 'multiple topics'}.`,
    affectedTopics,
    occurrenceCount: highConfWrong.length,
    examples,
    severity: computeSeverity(highConfWrong.length, pct),
    recommendation: `Focus on topics where you feel confident but answer incorrectly. These represent dangerous misconceptions that need targeted review and re-learning from first principles.`,
    percentage: pct,
  }];
}

/**
 * Detect framing traps: same topic missed under certain difficulty levels
 * or when questions are harder (Hard difficulty) vs easier framing (Easy).
 * This identifies when understanding is surface-level.
 */
export function detectFramingTraps(
  allAttempts: QuestionAttemptWithContext[]
): MistakePattern[] {
  // Group by topic, then by difficulty
  const topicDifficulty = new Map<string, Map<string, { correct: number; total: number; examples: QuestionAttemptWithContext[] }>>();

  for (const item of allAttempts) {
    const topic = item.question.topic || item.question.subject;
    if (!topicDifficulty.has(topic)) {
      topicDifficulty.set(topic, new Map());
    }
    const difficulties = topicDifficulty.get(topic)!;
    const diff = item.question.difficulty;
    if (!difficulties.has(diff)) {
      difficulties.set(diff, { correct: 0, total: 0, examples: [] });
    }
    const stats = difficulties.get(diff)!;
    stats.total++;
    if (item.attempt.correct) {
      stats.correct++;
    } else {
      stats.examples.push(item);
    }
  }

  const patterns: MistakePattern[] = [];

  for (const [topic, difficulties] of topicDifficulty) {
    const easyStats = difficulties.get('Easy');
    const hardStats = difficulties.get('Hard');

    // Need sufficient data for both levels
    if (!easyStats || !hardStats || easyStats.total < 2 || hardStats.total < 2) continue;

    const easyAccuracy = easyStats.correct / easyStats.total;
    const hardAccuracy = hardStats.correct / hardStats.total;

    // Flag when easy accuracy >= 70% but hard accuracy <= 40%
    // This suggests surface understanding that breaks under complex framing
    if (easyAccuracy >= 0.7 && hardAccuracy <= 0.4) {
      const examples = hardStats.examples.slice(0, 3).map(buildExample);
      const hardErrorPct = Math.round((1 - hardAccuracy) * 100);

      patterns.push({
        id: `framing-trap-${topic}`.replace(/\s+/g, '-').toLowerCase(),
        patternType: 'framingTrap',
        description: `You answer ${Math.round(easyAccuracy * 100)}% of Easy "${topic}" questions correctly but only ${Math.round(hardAccuracy * 100)}% of Hard ones, suggesting your understanding breaks down when the framing is more complex.`,
        affectedTopics: [topic],
        occurrenceCount: hardStats.total - hardStats.correct,
        examples,
        severity: computeSeverity(hardStats.total - hardStats.correct, hardErrorPct),
        recommendation: `Practice "${topic}" with harder question variants. Focus on understanding the underlying principles rather than memorizing simple patterns.`,
        percentage: hardErrorPct,
      });
    }
  }

  return patterns;
}

function buildExample(item: QuestionAttemptWithContext): QuestionExample {
  const correctChoice = item.question.answerChoices.find((c) => c.isCorrect);
  return {
    questionId: item.question.id,
    questionText: item.question.questionText.slice(0, 150) + (item.question.questionText.length > 150 ? '...' : ''),
    selectedAnswer: item.attempt.selectedAnswer,
    correctAnswer: correctChoice?.label || 'Unknown',
    topic: item.question.topic || item.question.subject,
  };
}

function computeSeverity(occurrenceCount: number, errorPercentage: number): PatternSeverity {
  if (occurrenceCount >= 5 && errorPercentage >= 60) return 'high';
  if (occurrenceCount >= 3 && errorPercentage >= 40) return 'medium';
  return 'low';
}
