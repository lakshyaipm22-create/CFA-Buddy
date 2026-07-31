'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  User,
  Play,
  Eye,
  Layers,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';

const DISMISS_KEY = 'cfa-buddy-onboarding-dismissed';
const PROFILE_KEY = 'cfa-buddy-local-profile';
const SESSIONS_KEY = 'cfa-practice-sessions';
const FLASHCARDS_KEY = 'cfa-flashcards';
const PAGES_KEY = 'cfa-buddy-recent-pages';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed: boolean;
}

function checkProfileSet(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return false;
    const profile = JSON.parse(raw);
    return profile.displayName && profile.displayName !== 'CFA Student';
  } catch {
    return false;
  }
}

function checkSessionsExist(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return false;
    const sessions = JSON.parse(raw);
    return Array.isArray(sessions) && sessions.length > 0;
  } catch {
    return false;
  }
}

function checkVisitedAttempts(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PAGES_KEY);
    if (!raw) return false;
    const pages = JSON.parse(raw);
    return Array.isArray(pages) && pages.some((p: { path: string }) => p.path.startsWith('/questions/attempts'));
  } catch {
    return false;
  }
}

function checkFlashcardsExist(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(FLASHCARDS_KEY);
    if (!raw) return false;
    const cards = JSON.parse(raw);
    return Array.isArray(cards) && cards.length > 0;
  } catch {
    return false;
  }
}

function checkExamDateSet(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return false;
    const profile = JSON.parse(raw);
    return !!profile.examDate;
  } catch {
    return false;
  }
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DISMISS_KEY) === 'true';
}

function getChecklistItems(): ChecklistItem[] {
  return [
    {
      id: 'profile',
      label: 'Set up your profile',
      description: 'Add your name and study preferences',
      href: '/settings',
      icon: <User className="h-4 w-4" />,
      completed: checkProfileSet(),
    },
    {
      id: 'session',
      label: 'Start your first practice session',
      description: 'Answer questions to track progress',
      href: '/questions',
      icon: <Play className="h-4 w-4" />,
      completed: checkSessionsExist(),
    },
    {
      id: 'review',
      label: 'Review your results',
      description: 'Check how you performed',
      href: '/questions/attempts',
      icon: <Eye className="h-4 w-4" />,
      completed: checkVisitedAttempts(),
    },
    {
      id: 'flashcards',
      label: 'Create flashcards',
      description: 'Build your study deck for spaced repetition',
      href: '/flashcards',
      icon: <Layers className="h-4 w-4" />,
      completed: checkFlashcardsExist(),
    },
    {
      id: 'examDate',
      label: 'Set your exam date',
      description: 'Enable countdown and study planning',
      href: '/settings',
      icon: <Calendar className="h-4 w-4" />,
      completed: checkExamDateSet(),
    },
  ];
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [items] = useState(() => getChecklistItems());

  const completedCount = items.filter((i) => i.completed).length;

  // Hide if dismissed or if user has completed 3+ items
  if (dismissed || completedCount >= 3) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-6 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'rgba(197, 162, 88, 0.15)' }}
          >
            <Sparkles className="h-5 w-5 text-[#C5A258]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Getting Started</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Complete these steps to set up your study workflow
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: '#C5A258' }}
          />
        </div>
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {completedCount}/{items.length}
        </span>
      </div>

      {/* Checklist items */}
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
              item.completed
                ? 'opacity-60'
                : 'hover:bg-[var(--nav-hover-bg)]'
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#00843D]" />
            ) : (
              <Circle className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  item.completed
                    ? 'line-through text-[var(--text-muted)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">{item.description}</p>
            </div>
            <span className="shrink-0 text-[var(--text-muted)]">{item.icon}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
