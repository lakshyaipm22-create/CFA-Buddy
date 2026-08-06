export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarColor: string;
  accuracy: number; // 0-100
  streakDays: number;
  questionsCompleted: number;
  level: number;
  isCurrentUser: boolean;
}

export interface GroupMember {
  id: string;
  displayName: string;
  avatarColor: string;
  joinedAt: string;
  questionsCompleted: number;
  accuracy: number;
}

export interface GroupProgress {
  totalQuestions: number;
  averageAccuracy: number;
  activeMembersThisWeek: number;
  topStreak: number;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
  createdBy: string;
  members: GroupMember[];
  progress: GroupProgress;
}

export type ActivityType =
  | 'streak_milestone'
  | 'questions_milestone'
  | 'level_up'
  | 'subject_mastery'
  | 'badge_earned'
  | 'group_joined'
  | 'exam_completed';

export interface ActivityFeedItem {
  id: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  metadata?: Record<string, string | number>;
}

export interface Achievement {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
}
