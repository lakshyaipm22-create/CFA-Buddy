'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { navigationItems } from '@/shared/config/navigation';
import { Settings } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-64 flex-col px-3 py-4"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 px-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-lg">
          <Image
            src="/CFA Buddy_logo.png"
            alt="CFA Buddy"
            width={40}
            height={40}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002B5C] text-lg font-bold text-[#C5A258]">C</span>';
            }}
          />
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--sidebar-title)' }}>
            CFA Buddy
          </h1>
          <p className="text-[10px]" style={{ color: 'var(--sidebar-subtitle)' }}>
            Your CFA Operating System
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'
              )}
              style={{
                background: isActive ? 'var(--nav-active-bg)' : undefined,
                color: isActive ? 'var(--nav-active-text)' : 'var(--nav-text)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--nav-hover-bg)';
                  e.currentTarget.style.color = 'var(--nav-text-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.color = 'var(--nav-text)';
                }
              }}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--sidebar-border)' }} className="pt-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--nav-hover-bg)';
            e.currentTarget.style.color = 'var(--nav-text-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '';
            e.currentTarget.style.color = 'var(--nav-text)';
          }}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
