import type { LeaderboardEntry } from '../types';
import { saveLeaderboardCache } from './storage';

const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

/**
 * Simulated community members to populate the leaderboard.
 * In a real app this would come from a backend.
 */
const SIMULATED_MEMBERS: Omit<LeaderboardEntry, 'isCurrentUser'>[] = [
  { id: 'sim-1', displayName: 'Alex Chen', avatarColor: AVATAR_COLORS[0], accuracy: 89, streakDays: 42, questionsCompleted: 1847, level: 14 },
  { id: 'sim-2', displayName: 'Priya Sharma', avatarColor: AVATAR_COLORS[1], accuracy: 92, streakDays: 28, questionsCompleted: 2103, level: 16 },
  { id: 'sim-3', displayName: 'Marcus Williams', avatarColor: AVATAR_COLORS[2], accuracy: 85, streakDays: 65, questionsCompleted: 1523, level: 12 },
  { id: 'sim-4', displayName: 'Sarah Johnson', avatarColor: AVATAR_COLORS[3], accuracy: 91, streakDays: 33, questionsCompleted: 1956, level: 15 },
  { id: 'sim-5', displayName: 'David Kim', avatarColor: AVATAR_COLORS[4], accuracy: 78, streakDays: 15, questionsCompleted: 982, level: 9 },
  { id: 'sim-6', displayName: 'Emma Thompson', avatarColor: AVATAR_COLORS[5], accuracy: 87, streakDays: 21, questionsCompleted: 1345, level: 11 },
  { id: 'sim-7', displayName: 'James Liu', avatarColor: AVATAR_COLORS[6], accuracy: 94, streakDays: 55, questionsCompleted: 2450, level: 18 },
  { id: 'sim-8', displayName: 'Rachel Green', avatarColor: AVATAR_COLORS[7], accuracy: 82, streakDays: 12, questionsCompleted: 876, level: 8 },
  { id: 'sim-9', displayName: 'Michael Brown', avatarColor: AVATAR_COLORS[8], accuracy: 76, streakDays: 8, questionsCompleted: 654, level: 7 },
  { id: 'sim-10', displayName: 'Lisa Wang', avatarColor: AVATAR_COLORS[9], accuracy: 88, streakDays: 37, questionsCompleted: 1678, level: 13 },
  { id: 'sim-11', displayName: 'Chris Anderson', avatarColor: AVATAR_COLORS[0], accuracy: 83, streakDays: 19, questionsCompleted: 1102, level: 10 },
  { id: 'sim-12', displayName: 'Nina Patel', avatarColor: AVATAR_COLORS[1], accuracy: 90, streakDays: 44, questionsCompleted: 1890, level: 14 },
  { id: 'sim-13', displayName: 'Tom Rodriguez', avatarColor: AVATAR_COLORS[2], accuracy: 74, streakDays: 5, questionsCompleted: 432, level: 5 },
  { id: 'sim-14', displayName: 'Kate Miller', avatarColor: AVATAR_COLORS[3], accuracy: 86, streakDays: 26, questionsCompleted: 1456, level: 12 },
  { id: 'sim-15', displayName: 'Ryan Taylor', avatarColor: AVATAR_COLORS[4], accuracy: 81, streakDays: 14, questionsCompleted: 945, level: 9 },
  { id: 'sim-16', displayName: 'Amy Zhang', avatarColor: AVATAR_COLORS[5], accuracy: 93, streakDays: 50, questionsCompleted: 2278, level: 17 },
  { id: 'sim-17', displayName: 'Jordan White', avatarColor: AVATAR_COLORS[6], accuracy: 79, streakDays: 10, questionsCompleted: 789, level: 8 },
  { id: 'sim-18', displayName: 'Olivia Martinez', avatarColor: AVATAR_COLORS[7], accuracy: 84, streakDays: 23, questionsCompleted: 1234, level: 11 },
  { id: 'sim-19', displayName: 'Daniel Lee', avatarColor: AVATAR_COLORS[8], accuracy: 77, streakDays: 7, questionsCompleted: 567, level: 6 },
];

export type LeaderboardSortKey = 'accuracy' | 'streak' | 'questions';

interface CurrentUserData {
  displayName: string;
  accuracy: number;
  streakDays: number;
  questionsCompleted: number;
  level: number;
}

/**
 * Calculate leaderboard rankings from local gamification data + simulated community data.
 * Returns the top 20 entries sorted by the specified criteria.
 */
export function calculateLeaderboard(
  sortBy: LeaderboardSortKey,
  currentUser: CurrentUserData | null
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = SIMULATED_MEMBERS.map((m) => ({
    ...m,
    isCurrentUser: false,
  }));

  // Add current user if available
  if (currentUser) {
    entries.push({
      id: 'current-user',
      displayName: currentUser.displayName || 'You',
      avatarColor: '#C5A258', // Gold for current user
      accuracy: currentUser.accuracy,
      streakDays: currentUser.streakDays,
      questionsCompleted: currentUser.questionsCompleted,
      level: currentUser.level,
      isCurrentUser: true,
    });
  }

  // Sort by selected criteria
  entries.sort((a, b) => {
    switch (sortBy) {
      case 'accuracy':
        return b.accuracy - a.accuracy;
      case 'streak':
        return b.streakDays - a.streakDays;
      case 'questions':
        return b.questionsCompleted - a.questionsCompleted;
      default:
        return b.accuracy - a.accuracy;
    }
  });

  // Keep top 20
  const top20 = entries.slice(0, 20);
  saveLeaderboardCache(top20);
  return top20;
}
