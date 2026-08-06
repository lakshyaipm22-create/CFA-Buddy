'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, X, Clock } from 'lucide-react';
import { expireOldSessions } from '../actions/session-persistence';
import type { PersistedSessionState } from '../actions/session-persistence';

const PERSISTED_SESSIONS_KEY = 'cfa-buddy-persisted-sessions';

interface ResumeSessionBannerProps {
  className?: string;
}

/**
 * Banner displayed when incomplete quiz sessions exist.
 * Checks localStorage for persisted session state and prompts the user
 * to resume where they left off.
 */
export function ResumeSessionBanner({ className = '' }: ResumeSessionBannerProps) {
  const [sessions, setSessions] = useState<PersistedSessionState[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PERSISTED_SESSIONS_KEY);
      if (!raw) return [];

      const parsed: PersistedSessionState[] = JSON.parse(raw);
      const now = new Date();

      // Filter out expired sessions
      const valid = parsed.filter((s) => new Date(s.expiresAt) > now);

      if (valid.length !== parsed.length) {
        // Clean up expired entries
        localStorage.setItem(PERSISTED_SESSIONS_KEY, JSON.stringify(valid));
      }

      return valid;
    } catch {
      return [];
    }
  });
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();
  const [mountTime] = useState(() => Date.now());
  const router = useRouter();

  useEffect(() => {
    // Expire old sessions on the server side
    startTransition(() => {
      void expireOldSessions();
    });
  }, []);

  const handleResume = (session: PersistedSessionState) => {
    router.push(`/questions?resume=${session.sessionId}`);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleDismissOne = (sessionId: string) => {
    const updated = sessions.filter((s) => s.sessionId !== sessionId);
    setSessions(updated);
    localStorage.setItem(PERSISTED_SESSIONS_KEY, JSON.stringify(updated));
  };

  if (dismissed || sessions.length === 0) return null;

  const formatTimeAgo = (dateStr: string): string => {
    const diff = mountTime - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={`rounded-lg border border-[#C5A258]/30 bg-[#C5A258]/5 p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#C5A258]" />
          <h3 className="text-sm font-medium text-white">
            {sessions.length === 1
              ? 'You have an incomplete session'
              : `You have ${sessions.length} incomplete sessions`}
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {sessions.slice(0, 3).map((session) => {
          const progress = Math.round(
            (Object.keys(session.answers).length / session.questionIds.length) * 100
          );

          return (
            <div
              key={session.sessionId}
              className="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  {session.mode} - {session.config.subject ?? session.config.topic ?? 'Mixed'}
                </p>
                <p className="text-xs text-zinc-400">
                  {progress}% complete ({Object.keys(session.answers).length}/{session.questionIds.length}) - Saved {formatTimeAgo(session.savedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleResume(session)}
                  className="flex items-center gap-1 rounded-lg bg-[#C5A258] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#d4b56a]"
                >
                  <Play className="h-3 w-3" />
                  Resume
                </button>
                <button
                  onClick={() => handleDismissOne(session.sessionId)}
                  className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
