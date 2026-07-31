'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Brain, Flame, ListChecks } from 'lucide-react';
import { getFlashcards } from '@/features/flashcards/utils/storage';
import { getCardsDueToday } from '@/features/flashcards/utils/sm2';
import { getReviewQueueSummary } from '@/features/review-queue/utils/queue-builder';
import { useLocalStorageSessions } from '@/shared/hooks/use-local-storage-sessions';

interface NotificationEntry {
  id: string;
  icon: React.ReactNode;
  message: string;
  href: string;
  type: 'info' | 'warning';
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessions = useLocalStorageSessions();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const notifications = useMemo<NotificationEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    const items: NotificationEntry[] = [];

    // Flashcards due
    const cards = getFlashcards();
    const due = getCardsDueToday(cards);
    if (due.length > 0) {
      items.push({
        id: 'flashcards-due',
        icon: <Brain className="h-4 w-4" />,
        message: `${due.length} flashcard${due.length > 1 ? 's' : ''} due for review`,
        href: '/practice',
        type: 'info',
      });
    }

    // Streak warning
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length >= 3) {
      const today = new Date().toISOString().slice(0, 10);
      const hasStudiedToday = completed.some(s =>
        s.attempts?.some(a => a.timestamp?.startsWith(today))
      );
      if (!hasStudiedToday) {
        items.push({
          id: 'streak-warning',
          icon: <Flame className="h-4 w-4" />,
          message: 'Study today to keep your streak!',
          href: '/questions',
          type: 'warning',
        });
      }
    }

    // Review items due
    const reviewSummary = getReviewQueueSummary();
    if (reviewSummary.count > 0) {
      items.push({
        id: 'review-due',
        icon: <ListChecks className="h-4 w-4" />,
        message: `${reviewSummary.count} review item${reviewSummary.count > 1 ? 's' : ''} due (~${reviewSummary.estimatedMinutes} min)`,
        href: '/review',
        type: 'info',
      });
    }

    return items;
  }, [sessions]);

  const totalCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{
          background: 'var(--header-input-bg)',
          border: '1px solid var(--header-input-border)',
          color: 'var(--header-text)',
        }}
        aria-label={`Notifications${totalCount > 0 ? ` (${totalCount} pending)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C5A258] text-[9px] font-bold text-white">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border shadow-xl"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Notifications
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                All caught up! No pending items.
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:opacity-80"
                  style={{
                    borderBottom: '1px solid var(--card-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--nav-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '';
                  }}
                >
                  <span
                    className="mt-0.5"
                    style={{
                      color: notification.type === 'warning' ? '#C5A258' : 'var(--foreground-secondary)',
                    }}
                  >
                    {notification.icon}
                  </span>
                  <p className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                    {notification.message}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
