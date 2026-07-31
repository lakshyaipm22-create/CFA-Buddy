import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  badge,
  action,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              {title}
            </h1>
            {badge && badge}
          </div>
          {subtitle && (
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
