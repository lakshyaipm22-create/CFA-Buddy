'use client';

import { useState } from 'react';
import { Trophy, Users, Activity } from 'lucide-react';
import { Leaderboard } from '@/features/social/components/leaderboard';
import { StudyGroups } from '@/features/social/components/study-groups';
import { ActivityFeed } from '@/features/social/components/activity-feed';

type Tab = 'leaderboard' | 'groups' | 'activity';

const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Community
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Compare progress, join study groups, and celebrate achievements
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--nav-active-text)' : 'var(--foreground-secondary)',
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'groups' && <StudyGroups />}
        {activeTab === 'activity' && <ActivityFeed />}
      </div>
    </div>
  );
}
