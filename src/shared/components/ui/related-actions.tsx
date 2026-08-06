'use client';

import Link from 'next/link';
import {
  Repeat,
  Layers,
  AlertCircle,
  BookOpen,
  Calculator,
  FileText,
  Target,
  CheckSquare,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Repeat,
  Layers,
  AlertCircle,
  BookOpen,
  Calculator,
  FileText,
  Target,
  CheckSquare,
  BarChart3,
  ClipboardList,
};

export interface RelatedActionItem {
  href: string;
  icon: LucideIcon | string;
  label: string;
  description: string;
}

interface RelatedActionsProps {
  items: RelatedActionItem[];
  title?: string;
}

function resolveIcon(icon: LucideIcon | string): LucideIcon | null {
  if (typeof icon === 'string') {
    return iconMap[icon] ?? null;
  }
  return icon;
}

export function RelatedActions({ items, title = 'Related Actions' }: RelatedActionsProps) {
  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-medium uppercase tracking-wider"
        style={{ color: 'var(--foreground-secondary)' }}
      >
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = resolveIcon(item.icon);
          if (!Icon) return null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
                  style={{ backgroundColor: 'var(--nav-hover-bg)' }}
                >
                  <Icon
                    className="h-4 w-4 transition-colors duration-200"
                    style={{ color: 'var(--accent-secondary)' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="mt-0.5 text-xs leading-tight"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
