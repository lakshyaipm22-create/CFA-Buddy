'use client';

import { ArrowLeft, Users, Target, Flame, BarChart3 } from 'lucide-react';
import type { StudyGroup } from '../types';

interface GroupDetailProps {
  group: StudyGroup;
  onBack: () => void;
}

export function GroupDetail({ group, onBack }: GroupDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{group.name}</h2>
          {group.description && (
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{group.description}</p>
          )}
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Members" value={group.members.length.toString()} />
        <StatCard icon={BarChart3} label="Avg Accuracy" value={`${group.progress.averageAccuracy}%`} />
        <StatCard icon={Target} label="Total Questions" value={group.progress.totalQuestions.toLocaleString()} />
        <StatCard icon={Flame} label="Top Streak" value={`${group.progress.topStreak} days`} />
      </div>

      {/* Members List */}
      <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Members ({group.members.length})
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: member.avatarColor }}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {member.displayName}
                  {member.id === 'current-user' && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(197, 162, 88, 0.2)', color: '#C5A258' }}>
                      YOU
                    </span>
                  )}
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {member.questionsCompleted} Qs
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {member.accuracy}% accuracy
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Code */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <p className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          Invite Code
        </p>
        <div className="flex items-center gap-3">
          <code
            className="rounded-lg px-4 py-2 text-lg font-bold tracking-widest"
            style={{ background: 'rgba(0, 43, 92, 0.3)', color: '#C5A258' }}
          >
            {group.inviteCode}
          </code>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Share this code to invite others
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color: '#C5A258' }} />
        <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--foreground-secondary)' }}>
          {label}
        </span>
      </div>
      <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
    </div>
  );
}
