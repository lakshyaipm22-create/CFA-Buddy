'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mobileNavItems } from '@/shared/config/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t px-1 py-1 md:hidden"
      style={{
        background: 'var(--bottom-nav-bg)',
        borderColor: 'var(--bottom-nav-border)',
      }}
      aria-label="Mobile navigation"
    >
      {mobileNavItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors"
            style={{
              color: isActive ? 'var(--bottom-nav-active)' : 'var(--nav-text)',
              background: isActive ? 'var(--nav-hover-bg)' : undefined,
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
