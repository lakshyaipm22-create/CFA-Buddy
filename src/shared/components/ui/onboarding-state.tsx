'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Play,
  Calendar,
  BookOpen,
  PenLine,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';

const ONBOARDING_DISMISS_KEY = 'cfa-buddy-onboarding-guide-dismissed';
const ONBOARDING_ACTIONS_KEY = 'cfa-buddy-onboarding-actions';
const ATTEMPTS_KEY = 'cfa-buddy-attempts';
const NOTES_KEY = 'cfa-buddy-study-notes';
const FLASHCARDS_KEY = 'cfa-buddy-flashcards';
const PROFILE_KEY = 'cfa-buddy-local-profile';

interface GuidedPrompt {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed: boolean;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_DISMISS_KEY) === 'true';
}

function getCompletedActions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ONBOARDING_ACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function hasAttempts(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

function hasNotes(): boolean {
  if (typeof window === 'undefined') return false;
  // Notes can be stored with various keys; check for any
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(NOTES_KEY)) {
      const val = localStorage.getItem(key);
      if (val && val.length > 2) return true;
    }
  }
  return false;
}

function hasFlashcards(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(FLASHCARDS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

function hasExamDate(): boolean {
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

function isFirstTimeUser(): boolean {
  return !hasAttempts() && !hasNotes() && !hasFlashcards();
}

function getPrompts(): GuidedPrompt[] {
  const actions = getCompletedActions();
  return [
    {
      id: 'first-quiz',
      label: 'Take your first quiz',
      description: 'Start a practice session to test your knowledge',
      href: '/questions',
      icon: <Play className="h-5 w-5" />,
      completed: hasAttempts() || actions.includes('first-quiz'),
    },
    {
      id: 'exam-date',
      label: 'Add your exam date',
      description: 'Set up countdown and study planning features',
      href: '/profile',
      icon: <Calendar className="h-5 w-5" />,
      completed: hasExamDate() || actions.includes('exam-date'),
    },
    {
      id: 'browse-resources',
      label: 'Browse study resources',
      description: 'Explore the resource library with organized materials',
      href: '/resources',
      icon: <BookOpen className="h-5 w-5" />,
      completed: actions.includes('browse-resources'),
    },
    {
      id: 'first-note',
      label: 'Create your first note',
      description: 'Start taking notes while studying readings',
      href: '/workspace',
      icon: <PenLine className="h-5 w-5" />,
      completed: hasNotes() || actions.includes('first-note'),
    },
  ];
}

/**
 * OnboardingState component for first-time users.
 * Detects users with no data and shows guided prompts.
 * Auto-dismisses after 2+ actions are completed.
 */
export function OnboardingState() {
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [prompts] = useState(() => getPrompts());

  const completedCount = useMemo(() => prompts.filter(p => p.completed).length, [prompts]);

  // Don't render if user is not first-time, already dismissed, or completed 2+ actions
  if (dismissed || completedCount >= 2 || !isFirstTimeUser()) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'linear-gradient(135deg, rgba(0, 43, 92, 0.1), rgba(197, 162, 88, 0.05))' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'rgba(197, 162, 88, 0.15)' }}
          >
            <Sparkles className="h-5 w-5 text-[#C5A258]" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Welcome to CFA Buddy
            </h3>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Get started with these quick actions to set up your study workflow
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-md p-1 transition-colors hover:bg-white/5"
          style={{ color: 'var(--foreground-secondary)' }}
          aria-label="Dismiss welcome guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Guided Prompts */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt.id}
            href={prompt.href}
            className="group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 hover:border-[#C5A258]/40 hover:shadow-sm"
            style={{
              borderColor: prompt.completed ? 'var(--accent-success)' : 'var(--card-border)',
              background: prompt.completed ? 'rgba(0, 132, 61, 0.05)' : 'var(--card-bg)',
              opacity: prompt.completed ? 0.6 : 1,
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: prompt.completed ? 'rgba(0, 132, 61, 0.15)' : 'rgba(197, 162, 88, 0.1)',
                color: prompt.completed ? '#00843D' : '#C5A258',
              }}
            >
              {prompt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {prompt.label}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--foreground-secondary)' }}>
                {prompt.description}
              </p>
            </div>
            {!prompt.completed && (
              <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#C5A258' }} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
