'use client';

import { useMemo } from 'react';
import { Bell, Brain, Flame } from 'lucide-react';
import { getFlashcards } from '@/features/flashcards/utils/storage';
import { getCardsDueToday } from '@/features/flashcards/utils/sm2';
import { useLocalStorageSessions } from '@/features/dashboard/hooks/use-local-storage-sessions';

interface NotificationItem {
  icon: React.ReactNode;
  message: string;
  type: 'info' | 'warning';
}

export function NotificationBadges() {
  const sessions = useLocalStorageSessions();

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // Check flashcards due
    if (typeof window !== 'undefined') {
      const cards = getFlashcards();
      const due = getCardsDueToday(cards);
      if (due.length > 0) {
        items.push({
          icon: <Brain className="h-3.5 w-3.5" />,
          message: `${due.length} flashcard${due.length > 1 ? 's' : ''} due for review`,
          type: 'info',
        });
      }
    }

    // Check study streak
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const hasStudiedToday = completed.some(s =>
        s.attempts?.some(a => a.timestamp?.startsWith(today))
      );
      if (!hasStudiedToday && completed.length >= 3) {
        items.push({
          icon: <Flame className="h-3.5 w-3.5" />,
          message: 'Study today to keep your streak!',
          type: 'warning',
        });
      }
    }

    return items;
  }, [sessions]);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map((n, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{
            borderColor: n.type === 'warning' ? 'rgba(197,162,88,0.3)' : 'var(--card-border)',
            background: n.type === 'warning' ? 'rgba(197,162,88,0.05)' : 'var(--card-bg)',
          }}
        >
          <span style={{ color: n.type === 'warning' ? '#C5A258' : 'var(--foreground-secondary)' }}>
            {n.icon}
          </span>
          <p className="text-xs" style={{ color: 'var(--foreground)' }}>{n.message}</p>
        </div>
      ))}
    </div>
  );
}

export function NotificationBadgeCount() {
  const notifications = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const cards = getFlashcards();
    return getCardsDueToday(cards).length;
  }, []);

  if (notifications === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C5A258] text-[9px] font-bold text-white">
      {notifications > 9 ? '9+' : notifications}
    </span>
  );
}
