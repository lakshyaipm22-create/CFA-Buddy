import type { Badge, GamificationState } from '../types';

export interface BadgeCheckContext {
  totalQuestions: number;
  streakDays: number;
  uniqueSubjects: number;
  hasMockCompleted: boolean;
  overallAccuracy: number;
  level: number;
}

const BADGE_DEFINITIONS: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (ctx: BadgeCheckContext) => boolean;
}> = [
  {
    id: 'first-100',
    name: 'First 100 Questions',
    description: 'Answered 100 practice questions',
    icon: 'Trophy',
    check: (ctx) => ctx.totalQuestions >= 100,
  },
  {
    id: '7-day-streak',
    name: '7-Day Streak',
    description: 'Studied 7 consecutive days',
    icon: 'Flame',
    check: (ctx) => ctx.streakDays >= 7,
  },
  {
    id: 'all-subjects',
    name: 'All Subjects Attempted',
    description: 'Practiced questions from all 10 CFA subjects',
    icon: 'BookOpen',
    check: (ctx) => ctx.uniqueSubjects >= 10,
  },
  {
    id: 'mock-completed',
    name: 'Mock Exam Completed',
    description: 'Finished a full mock exam session',
    icon: 'GraduationCap',
    check: (ctx) => ctx.hasMockCompleted,
  },
  {
    id: '80-accuracy',
    name: '80% Accuracy Club',
    description: 'Achieved 80% or higher overall accuracy',
    icon: 'Target',
    check: (ctx) => ctx.overallAccuracy >= 80,
  },
  {
    id: '500-questions',
    name: '500 Questions',
    description: 'Answered 500 practice questions',
    icon: 'Award',
    check: (ctx) => ctx.totalQuestions >= 500,
  },
  {
    id: '30-day-streak',
    name: '30-Day Streak',
    description: 'Studied 30 consecutive days',
    icon: 'Zap',
    check: (ctx) => ctx.streakDays >= 30,
  },
  {
    id: 'level-5',
    name: 'Level 5',
    description: 'Reached Level 5 in XP progression',
    icon: 'Star',
    check: (ctx) => ctx.level >= 5,
  },
];

/**
 * Check for newly earned badges. Returns array of badge IDs that were just earned.
 */
export function checkNewBadges(
  state: GamificationState,
  context: BadgeCheckContext
): string[] {
  const earnedIds = new Set(
    state.badges.filter((b) => b.earnedAt !== null).map((b) => b.id)
  );
  const newlyEarned: string[] = [];

  for (const def of BADGE_DEFINITIONS) {
    if (!earnedIds.has(def.id) && def.check(context)) {
      newlyEarned.push(def.id);
    }
  }

  return newlyEarned;
}

/**
 * Get all badge definitions with their earned status from state.
 */
export function getAllBadges(state: GamificationState): Badge[] {
  const earnedMap = new Map(
    state.badges.map((b) => [b.id, b.earnedAt])
  );

  return BADGE_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    earnedAt: earnedMap.get(def.id) ?? null,
  }));
}

/**
 * Mark badges as earned in the state and return updated state.
 */
export function awardBadges(
  state: GamificationState,
  badgeIds: string[]
): GamificationState {
  const now = new Date().toISOString();
  const existingIds = new Set(state.badges.map((b) => b.id));

  for (const id of badgeIds) {
    const def = BADGE_DEFINITIONS.find((d) => d.id === id);
    if (!def) continue;

    if (existingIds.has(id)) {
      // Update earnedAt
      state.badges = state.badges.map((b) =>
        b.id === id ? { ...b, earnedAt: now } : b
      );
    } else {
      state.badges.push({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: now,
      });
    }
  }

  return state;
}
