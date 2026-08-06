import type { StudyGroup, ActivityFeedItem, LeaderboardEntry } from '../types';

const GROUPS_KEY = 'cfa-buddy-groups';
const ACTIVITY_FEED_KEY = 'cfa-buddy-activity-feed';
const LEADERBOARD_KEY = 'cfa-buddy-leaderboard';

// --- Study Groups ---

export function getStudyGroups(): StudyGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudyGroup[];
  } catch {
    return [];
  }
}

export function saveStudyGroups(groups: StudyGroup[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function addStudyGroup(group: StudyGroup): void {
  const groups = getStudyGroups();
  groups.push(group);
  saveStudyGroups(groups);
}

export function removeStudyGroup(groupId: string): void {
  const groups = getStudyGroups().filter((g) => g.id !== groupId);
  saveStudyGroups(groups);
}

export function getStudyGroupById(groupId: string): StudyGroup | undefined {
  return getStudyGroups().find((g) => g.id === groupId);
}

export function getStudyGroupByInviteCode(code: string): StudyGroup | undefined {
  return getStudyGroups().find((g) => g.inviteCode === code);
}

// --- Activity Feed ---

export function getActivityFeed(): ActivityFeedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_FEED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityFeedItem[];
  } catch {
    return [];
  }
}

export function saveActivityFeed(items: ActivityFeedItem[]): void {
  if (typeof window === 'undefined') return;
  // Keep only the most recent 20 items
  const trimmed = items.slice(0, 20);
  localStorage.setItem(ACTIVITY_FEED_KEY, JSON.stringify(trimmed));
}

export function addActivityFeedItem(item: ActivityFeedItem): void {
  const items = getActivityFeed();
  items.unshift(item);
  saveActivityFeed(items);
}

// --- Leaderboard Cache ---

export function getLeaderboardCache(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function saveLeaderboardCache(entries: LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}
