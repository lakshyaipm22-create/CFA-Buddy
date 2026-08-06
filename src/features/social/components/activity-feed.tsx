'use client';

import { useState } from 'react';
import { Trophy, Flame, Star, BookOpen, Award, Users, ClipboardCheck } from 'lucide-react';
import type { ActivityFeedItem, ActivityType } from '../types';
import { getActivityFeed } from '../utils/storage';
import { ensureSimulatedActivity, detectNewAchievements, publishAchievementsToFeed } from '../utils/achievements';
import { getGamificationState } from '@/features/gamification/utils/gamification-storage';

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'streak_milestone':
      return Flame;
    case 'questions_milestone':
      return BookOpen;
    case 'level_up':
      return Star;
    case 'subject_mastery':
      return Trophy;
    case 'badge_earned':
      return Award;
    case 'group_joined':
      return Users;
    case 'exam_completed':
      return ClipboardCheck;
    default:
      return Star;
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case 'streak_milestone':
      return '#F59E0B';
    case 'questions_milestone':
      return '#3B82F6';
    case 'level_up':
      return '#C5A258';
    case 'subject_mastery':
      return '#10B981';
    case 'badge_earned':
      return '#8B5CF6';
    case 'group_joined':
      return '#06B6D4';
    case 'exam_completed':
      return '#00843D';
    default:
      return '#C5A258';
  }
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function ActivityFeed() {
  const [items] = useState<ActivityFeedItem[]>(() => {
    // Ensure simulated activity exists
    ensureSimulatedActivity();

    // Detect any new achievements for current user
    const gamState = getGamificationState();
    const newAchievements = detectNewAchievements(gamState);
    if (newAchievements.length > 0) {
      publishAchievementsToFeed(newAchievements, 'current-user', 'You');
    }

    // Load the feed
    return getActivityFeed();
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border py-12" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <Trophy className="mb-3 h-10 w-10" style={{ color: 'var(--foreground-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>No activity yet</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Start studying to see achievements here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = getActivityIcon(item.type);
        const color = getActivityColor(item.type);
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border p-4 transition-colors"
            style={{
              borderColor: 'var(--border)',
              background: item.userId === 'current-user' ? 'rgba(197, 162, 88, 0.05)' : 'var(--card-bg)',
            }}
          >
            {/* Icon */}
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: `${color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: item.userId === 'current-user' ? '#C5A258' : 'var(--foreground)' }}
                >
                  {item.displayName}
                </span>
                {item.userId === 'current-user' && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(197, 162, 88, 0.2)', color: '#C5A258' }}>
                    YOU
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                {item.description}
              </p>
            </div>

            {/* Timestamp */}
            <span className="flex-shrink-0 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {getRelativeTime(item.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
