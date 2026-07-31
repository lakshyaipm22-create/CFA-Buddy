'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { routeSegmentLabels } from '@/shared/config/navigation';

function getSegmentLabel(segment: string): string {
  // Check our mapping first
  if (routeSegmentLabels[segment]) {
    return routeSegmentLabels[segment];
  }
  // For dynamic segments (UUIDs, IDs), show a truncated version
  if (segment.length > 12) {
    return segment.slice(0, 8) + '...';
  }
  // Capitalize and replace hyphens
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Only show breadcrumbs for nested routes (depth > 1)
  if (segments.length <= 1) {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = getSegmentLabel(segment);
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  // Back link goes to parent route
  const parentHref = '/' + segments.slice(0, segments.length - 1).join('/');
  const showBackButton = segments.length > 2;

  return (
    <div
      className="flex items-center gap-2 border-b px-6 py-2"
      style={{
        borderColor: 'var(--breadcrumb-separator)',
        background: 'var(--background-secondary)',
      }}
    >
      {showBackButton && (
        <Link
          href={parentHref}
          className="mr-1 flex items-center justify-center rounded-md p-1 transition-colors"
          style={{ color: 'var(--breadcrumb-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '';
          }}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {crumb.isLast ? (
              <span
                className="font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.href}
                  className="transition-colors hover:underline"
                  style={{ color: 'var(--breadcrumb-text)' }}
                >
                  {crumb.label}
                </Link>
                <ChevronRight
                  className="h-3 w-3"
                  style={{ color: 'var(--breadcrumb-separator)' }}
                />
              </>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
