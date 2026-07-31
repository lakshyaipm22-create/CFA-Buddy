'use client';

import {
  Trophy,
  Flame,
  BookOpen,
  GraduationCap,
  Target,
  Award,
  Zap,
  Star,
} from 'lucide-react';
import type { Badge } from '../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Flame,
  BookOpen,
  GraduationCap,
  Target,
  Award,
  Zap,
  Star,
};

interface BadgesDisplayProps {
  badges: Badge[];
}

export function BadgesDisplay({ badges }: BadgesDisplayProps) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Badges</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((badge) => {
          const IconComp = ICON_MAP[badge.icon] ?? Trophy;
          const earned = badge.earnedAt !== null;

          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all ${
                earned
                  ? 'border border-[#C5A258]/30 bg-[#C5A258]/5'
                  : 'border border-[var(--border-primary)] opacity-50'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  earned ? 'bg-[#C5A258]/20 text-[#C5A258]' : 'bg-[var(--border-primary)] text-[var(--text-muted)]'
                }`}
              >
                <IconComp className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)] leading-tight">
                {badge.name}
              </span>
              {earned && badge.earnedAt && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {new Date(badge.earnedAt).toLocaleDateString()}
                </span>
              )}
              {!earned && (
                <span className="text-[10px] text-[var(--text-muted)]">{badge.description}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
