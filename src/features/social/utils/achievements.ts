import type { GamificationState } from '@/features/gamification/types';
import type { Achievement, ActivityFeedItem } from '../types';
import { getActivityFeed, addActivityFeedItem } from './storage';

const ACHIEVEMENTS_DETECTED_KEY = 'cfa-buddy-achievements-detected';

function getDetectedAchievements(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_DETECTED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveDetectedAchievements(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACHIEVEMENTS_DETECTED_KEY, JSON.stringify(ids));
}

/**
 * Check gamification state for new achievements that haven't been announced yet.
 * Returns newly detected achievements.
 */
export function detectNewAchievements(state: GamificationState): Achievement[] {
  const detected = getDetectedAchievements();
  const newAchievements: Achievement[] = [];
  const now = new Date().toISOString();

  // Question milestones
  const totalQuestions = Object.values(state.dailyCounts).reduce((sum, count) => sum + count, 0);
  const questionMilestones = [50, 100, 250, 500, 1000, 2000, 5000];
  for (const milestone of questionMilestones) {
    const id = `questions-${milestone}`;
    if (totalQuestions >= milestone && !detected.includes(id)) {
      newAchievements.push({
        id,
        type: 'questions_milestone',
        description: `Completed ${milestone} questions`,
        timestamp: now,
      });
    }
  }

  // Streak milestones
  const streakMilestones = [3, 7, 14, 30, 60, 100];
  for (const milestone of streakMilestones) {
    const id = `streak-${milestone}`;
    if (state.streakDays >= milestone && !detected.includes(id)) {
      newAchievements.push({
        id,
        type: 'streak_milestone',
        description: `Achieved a ${milestone}-day study streak`,
        timestamp: now,
      });
    }
  }

  // Level milestones
  const levelMilestones = [5, 10, 15, 20, 25];
  for (const milestone of levelMilestones) {
    const id = `level-${milestone}`;
    if (state.level >= milestone && !detected.includes(id)) {
      newAchievements.push({
        id,
        type: 'level_up',
        description: `Reached Level ${milestone}`,
        timestamp: now,
      });
    }
  }

  // Badge milestones
  const earnedBadges = state.badges.filter((b) => b.earnedAt !== null);
  const badgeMilestones = [1, 5, 10, 20];
  for (const milestone of badgeMilestones) {
    const id = `badges-${milestone}`;
    if (earnedBadges.length >= milestone && !detected.includes(id)) {
      newAchievements.push({
        id,
        type: 'badge_earned',
        description: `Earned ${milestone} badge${milestone > 1 ? 's' : ''}`,
        timestamp: now,
      });
    }
  }

  // Save detected achievements
  if (newAchievements.length > 0) {
    const allDetected = [...detected, ...newAchievements.map((a) => a.id)];
    saveDetectedAchievements(allDetected);
  }

  return newAchievements;
}

/**
 * Convert achievements to activity feed items and add them to the feed.
 */
export function publishAchievementsToFeed(
  achievements: Achievement[],
  userId: string,
  displayName: string
): void {
  for (const achievement of achievements) {
    const feedItem: ActivityFeedItem = {
      id: `feed-${achievement.id}-${Date.now()}`,
      userId,
      displayName,
      avatarColor: '#C5A258',
      type: achievement.type,
      description: achievement.description,
      timestamp: achievement.timestamp,
    };
    addActivityFeedItem(feedItem);
  }
}

/**
 * Generate simulated community activity to make the feed look populated.
 * Only generates if the feed is currently empty.
 */
export function ensureSimulatedActivity(): ActivityFeedItem[] {
  const existingFeed = getActivityFeed();
  if (existingFeed.length > 0) return existingFeed;

  const simulatedItems: ActivityFeedItem[] = [
    {
      id: 'sim-feed-1',
      userId: 'sim-1',
      displayName: 'Alex Chen',
      avatarColor: '#3B82F6',
      type: 'streak_milestone',
      description: 'Achieved a 42-day study streak',
      timestamp: getRelativeTimestamp(1),
    },
    {
      id: 'sim-feed-2',
      userId: 'sim-7',
      displayName: 'James Liu',
      avatarColor: '#06B6D4',
      type: 'questions_milestone',
      description: 'Completed 2000 questions',
      timestamp: getRelativeTimestamp(2),
    },
    {
      id: 'sim-feed-3',
      userId: 'sim-2',
      displayName: 'Priya Sharma',
      avatarColor: '#EF4444',
      type: 'level_up',
      description: 'Reached Level 16',
      timestamp: getRelativeTimestamp(4),
    },
    {
      id: 'sim-feed-4',
      userId: 'sim-16',
      displayName: 'Amy Zhang',
      avatarColor: '#EC4899',
      type: 'exam_completed',
      description: 'Completed a Mock Exam with 88% accuracy',
      timestamp: getRelativeTimestamp(6),
    },
    {
      id: 'sim-feed-5',
      userId: 'sim-4',
      displayName: 'Sarah Johnson',
      avatarColor: '#F59E0B',
      type: 'subject_mastery',
      description: 'Mastered Fixed Income topic',
      timestamp: getRelativeTimestamp(8),
    },
    {
      id: 'sim-feed-6',
      userId: 'sim-3',
      displayName: 'Marcus Williams',
      avatarColor: '#10B981',
      type: 'streak_milestone',
      description: 'Achieved a 60-day study streak',
      timestamp: getRelativeTimestamp(12),
    },
    {
      id: 'sim-feed-7',
      userId: 'sim-10',
      displayName: 'Lisa Wang',
      avatarColor: '#6366F1',
      type: 'questions_milestone',
      description: 'Completed 1500 questions',
      timestamp: getRelativeTimestamp(18),
    },
    {
      id: 'sim-feed-8',
      userId: 'sim-12',
      displayName: 'Nina Patel',
      avatarColor: '#EF4444',
      type: 'badge_earned',
      description: 'Earned 10 badges',
      timestamp: getRelativeTimestamp(24),
    },
    {
      id: 'sim-feed-9',
      userId: 'sim-6',
      displayName: 'Emma Thompson',
      avatarColor: '#EC4899',
      type: 'level_up',
      description: 'Reached Level 11',
      timestamp: getRelativeTimestamp(30),
    },
    {
      id: 'sim-feed-10',
      userId: 'sim-11',
      displayName: 'Chris Anderson',
      avatarColor: '#3B82F6',
      type: 'questions_milestone',
      description: 'Completed 1000 questions',
      timestamp: getRelativeTimestamp(48),
    },
  ];

  // Save to feed
  if (typeof window !== 'undefined') {
    localStorage.setItem('cfa-buddy-activity-feed', JSON.stringify(simulatedItems));
  }

  return simulatedItems;
}

function getRelativeTimestamp(hoursAgo: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}
