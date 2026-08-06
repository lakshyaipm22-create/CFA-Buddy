'use client';

import { useState, useCallback } from 'react';
import { Plus, LogIn, Users, ChevronRight, Copy, Check, Info } from 'lucide-react';
import type { StudyGroup } from '../types';
import { getStudyGroups, addStudyGroup, getStudyGroupByInviteCode } from '../utils/storage';
import { GroupDetail } from './group-detail';

function generateId(): string {
  return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function StudyGroups() {
  const [groups, setGroups] = useState<StudyGroup[]>(() => getStudyGroups());
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create group form
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  // Join group form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const refreshGroups = useCallback(() => {
    setGroups(getStudyGroups());
  }, []);

  const handleCreate = () => {
    if (!createName.trim()) return;

    const newGroup: StudyGroup = {
      id: generateId(),
      name: createName.trim(),
      description: createDescription.trim(),
      inviteCode: generateInviteCode(),
      createdAt: new Date().toISOString(),
      createdBy: 'current-user',
      members: [
        {
          id: 'current-user',
          displayName: 'You',
          avatarColor: '#C5A258',
          joinedAt: new Date().toISOString(),
          questionsCompleted: 0,
          accuracy: 0,
        },
      ],
      progress: {
        totalQuestions: 0,
        averageAccuracy: 0,
        activeMembersThisWeek: 1,
        topStreak: 0,
      },
    };

    addStudyGroup(newGroup);
    refreshGroups();
    setCreateName('');
    setCreateDescription('');
    setShowCreate(false);
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    const group = getStudyGroupByInviteCode(code);
    if (group) {
      // Already a member check
      if (group.members.some((m) => m.id === 'current-user')) {
        setJoinError('You are already a member of this group.');
        return;
      }
      setSelectedGroup(group);
      setJoinCode('');
      setJoinError('');
      setShowJoin(false);
    } else {
      setJoinError('No group found with this invite code. Ask the group creator to share the code.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {
      // Fallback for environments without clipboard API
    });
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        onBack={() => {
          setSelectedGroup(null);
          refreshGroups();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div
        className="flex items-start gap-3 rounded-lg p-3"
        style={{ background: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
      >
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#C5A258' }} />
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Study groups are stored locally. Share your invite code with friends who use CFA Buddy on the same device, or note it for future multi-device sync when available.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { setShowCreate(true); setShowJoin(false); }}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ background: '#C5A258', color: '#0a0e14' }}
        >
          <Plus className="h-4 w-4" />
          Create Group
        </button>
        <button
          onClick={() => { setShowJoin(true); setShowCreate(false); }}
          className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <LogIn className="h-4 w-4" />
          Join Group
        </button>
      </div>

      {/* Create Group Form */}
      {showCreate && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Create a Study Group
          </h3>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Group Name
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g., CFA Level 1 - Spring 2025"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
              maxLength={50}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Description (optional)
            </label>
            <input
              type="text"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Brief description of the group"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
              maxLength={100}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!createName.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: '#C5A258', color: '#0a0e14' }}
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Join Group Form */}
      {showJoin && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Join a Study Group
          </h3>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Invite Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              placeholder="Enter 6-character code"
              className="w-full rounded-lg border px-3 py-2 text-sm uppercase outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
              maxLength={6}
            />
            {joinError && (
              <p className="mt-1 text-xs text-red-400">{joinError}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleJoin}
              disabled={joinCode.trim().length !== 6}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: '#C5A258', color: '#0a0e14' }}
            >
              Join
            </button>
            <button
              onClick={() => { setShowJoin(false); setJoinError(''); }}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 && !showCreate && !showJoin ? (
        <div className="flex flex-col items-center justify-center rounded-xl border py-12" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          <Users className="mb-3 h-10 w-10" style={{ color: 'var(--foreground-secondary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>No study groups yet</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Create a group or join one with an invite code
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 rounded-xl border p-4 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
              onClick={() => setSelectedGroup(group)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedGroup(group); }}
              role="button"
              tabIndex={0}
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background: 'rgba(0, 43, 92, 0.5)', color: '#C5A258' }}
              >
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {group.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopyCode(group.inviteCode); }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs"
                  style={{ color: 'var(--foreground-secondary)' }}
                  title="Copy invite code"
                >
                  {copiedCode === group.inviteCode ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {group.inviteCode}
                </button>
                <ChevronRight className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
