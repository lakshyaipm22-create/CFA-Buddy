import { SUBJECT_METADATA } from '@/features/formulas/data/subject-metadata';
import { CFA_SUBJECTS_ORDERED, CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';

export interface DailyPlanItem {
  date: string;
  subject: string;
  modules: string[];
  questionTarget: number;
  estimatedMinutes: number;
  type: 'learn' | 'review' | 'practice';
  priority: 'high' | 'medium' | 'low';
}

export interface StudyPlan {
  items: DailyPlanItem[];
  targetScore: number;
  examDate: string;
  daysRemaining: number;
}

const EXAM_DATE_KEY = 'cfa-buddy-exam-date';
const COMPLETED_KEY = 'cfa-buddy-study-plan-completed';

/**
 * Generate a personalized study plan based on subject performance gaps and exam weights.
 * Allocates more study days to subjects where the user has a larger gap from the target
 * AND where the subject has higher exam weight.
 */
export function generateStudyPlan(targetScore: number = 70): StudyPlan {
  const examDate = getExamDate();
  const daysRemaining = getDaysRemaining(examDate);
  const attempts = getAllAttempts();

  // Calculate per-subject accuracy
  const subjectAccuracy = computeSubjectAccuracy(attempts);

  // Calculate priority scores: gap * examWeight
  const priorities: { subject: string; priority: number; accuracy: number; type: 'learn' | 'review' | 'practice' }[] = [];
  let totalPriority = 0;

  for (const subject of CFA_SUBJECTS_ORDERED) {
    const accuracy = subjectAccuracy[subject] ?? -1; // -1 means no data
    const examWeight = CFA_CURRICULUM_WEIGHTS[subject] ?? 0.08;
    const gap = accuracy < 0 ? targetScore : Math.max(0, targetScore - accuracy);
    const priority = gap * examWeight;
    totalPriority += priority;

    let type: 'learn' | 'review' | 'practice';
    if (accuracy < 0) {
      type = 'learn';
    } else if (accuracy < targetScore) {
      type = 'practice';
    } else {
      type = 'review';
    }

    priorities.push({ subject, priority, accuracy, type });
  }

  // If total priority is 0 (all subjects at or above target), distribute evenly for review
  if (totalPriority === 0) {
    totalPriority = priorities.length;
    for (const p of priorities) {
      p.priority = 1;
    }
  }

  // Allocate study slots proportionally to priority
  const planDays = Math.min(daysRemaining, 60); // Plan at most 60 days ahead
  const activeDays = Math.max(planDays, 7); // Always generate at least 7 days

  // Allocate days to subjects proportionally
  const subjectDays: { subject: string; days: number; type: 'learn' | 'review' | 'practice'; priority: number }[] = [];

  for (const p of priorities) {
    const days = Math.max(1, Math.round((p.priority / totalPriority) * activeDays));
    subjectDays.push({ subject: p.subject, days, type: p.type, priority: p.priority });
  }

  // Generate daily plan items by cycling through subjects
  const items: DailyPlanItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort subjects by priority descending so highest priority subjects appear first
  const sortedSubjects = [...subjectDays].sort((a, b) => b.priority - a.priority);

  // Build a queue of subjects to assign to days
  const subjectQueue: { subject: string; type: 'learn' | 'review' | 'practice'; priority: number }[] = [];
  for (const sd of sortedSubjects) {
    for (let i = 0; i < sd.days; i++) {
      subjectQueue.push({ subject: sd.subject, type: sd.type, priority: sd.priority });
    }
  }

  // Interleave subjects to avoid consecutive same-subject days
  const interleaved = interleaveSubjects(subjectQueue);

  for (let dayIdx = 0; dayIdx < Math.min(interleaved.length, activeDays); dayIdx++) {
    const planDate = new Date(today);
    planDate.setDate(today.getDate() + dayIdx);
    const dateStr = formatDate(planDate);

    const entry = interleaved[dayIdx];
    const metadata = SUBJECT_METADATA[entry.subject as keyof typeof SUBJECT_METADATA];
    if (!metadata) continue;

    // Assign modules to study - rotate through the module list
    const moduleCount = Math.min(3, metadata.modules.length);
    const moduleOffset = dayIdx % metadata.modules.length;
    const modules: string[] = [];
    for (let m = 0; m < moduleCount; m++) {
      modules.push(metadata.modules[(moduleOffset + m) % metadata.modules.length]);
    }

    // Higher priority subjects get more questions
    const priorityLevel = getPriorityLevel(entry.priority, sortedSubjects[0]?.priority ?? 1);
    const questionTarget = priorityLevel === 'high' ? 15 : priorityLevel === 'medium' ? 10 : 5;
    const estimatedMinutes = questionTarget * 2;

    items.push({
      date: dateStr,
      subject: entry.subject,
      modules,
      questionTarget,
      estimatedMinutes,
      type: entry.type,
      priority: priorityLevel,
    });
  }

  return {
    items,
    targetScore,
    examDate: examDate || '',
    daysRemaining,
  };
}

/**
 * Get the daily plan items for a specific date.
 */
export function getDailyPlan(date: string): DailyPlanItem[] {
  const plan = generateStudyPlan();
  return plan.items.filter(item => item.date === date);
}

/**
 * Get the list of completed days from localStorage.
 */
export function getCompletedDays(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(COMPLETED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Mark a specific date as completed in localStorage.
 */
export function markDayCompleted(date: string): void {
  if (typeof window === 'undefined') return;
  const completed = getCompletedDays();
  if (!completed.includes(date)) {
    completed.push(date);
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
  }
}

/**
 * Unmark a specific date (toggle off completed).
 */
export function unmarkDayCompleted(date: string): void {
  if (typeof window === 'undefined') return;
  const completed = getCompletedDays().filter(d => d !== date);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
}

// --- Internal helpers ---

function getExamDate(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(EXAM_DATE_KEY) ?? '';
}

function getDaysRemaining(examDate: string): number {
  if (!examDate) return 90; // Default to 90 days if no exam date set
  const exam = new Date(examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function computeSubjectAccuracy(attempts: PracticeAttempt[]): Record<string, number> {
  const result: Record<string, number> = {};
  const subjectAttempts: Record<string, PracticeAttempt[]> = {};

  for (const attempt of attempts) {
    if (!subjectAttempts[attempt.subjectName]) {
      subjectAttempts[attempt.subjectName] = [];
    }
    subjectAttempts[attempt.subjectName].push(attempt);
  }

  for (const [subject, subAttempts] of Object.entries(subjectAttempts)) {
    // Use the most recent attempt's percentage as the accuracy
    const sorted = [...subAttempts].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    result[subject] = sorted[0].overallPercentage;
  }

  return result;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPriorityLevel(priority: number, maxPriority: number): 'high' | 'medium' | 'low' {
  if (maxPriority === 0) return 'medium';
  const ratio = priority / maxPriority;
  if (ratio >= 0.7) return 'high';
  if (ratio >= 0.3) return 'medium';
  return 'low';
}

function interleaveSubjects(
  queue: { subject: string; type: 'learn' | 'review' | 'practice'; priority: number }[]
): { subject: string; type: 'learn' | 'review' | 'practice'; priority: number }[] {
  if (queue.length === 0) return [];

  // Group by subject
  const groups: Record<string, { subject: string; type: 'learn' | 'review' | 'practice'; priority: number }[]> = {};
  for (const item of queue) {
    if (!groups[item.subject]) groups[item.subject] = [];
    groups[item.subject].push(item);
  }

  // Round-robin through groups sorted by size descending
  const groupKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  const result: { subject: string; type: 'learn' | 'review' | 'practice'; priority: number }[] = [];

  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const key of groupKeys) {
      if (groups[key].length > 0) {
        result.push(groups[key].shift()!);
        remaining = true;
      }
    }
  }

  return result;
}
