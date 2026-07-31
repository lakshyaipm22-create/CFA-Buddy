'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mobileNavItems } from '@/shared/config/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t px-2 py-2 md:hidden"
      style={{
        background: 'var(--bottom-nav-bg)',
        borderColor: 'var(--bottom-nav-border)',
      }}
    >
      {mobileNavItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors"
            style={{
              color: isActive ? 'var(--bottom-nav-active)' : 'var(--nav-text)',
            }}
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
