'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { navigationGroups } from '@/shared/config/navigation';
import { Settings, Menu, X, ChevronDown } from 'lucide-react';

const COLLAPSED_STATE_KEY = 'cfab-sidebar-collapsed-groups';

function getInitialCollapsedState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(COLLAPSED_STATE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return {};
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    () => getInitialCollapsedState()
  );

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(COLLAPSED_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const isGroupActive = (groupItems: { href: string }[]) => {
    return groupItems.some((item) => pathname.startsWith(item.href));
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="mb-6 flex items-center gap-3 px-3">
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
              if (target.parentElement) {
                target.parentElement.innerHTML = '<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002B5C] text-lg font-bold text-[#C5A258]">C</span>';
              }
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

      <nav className="flex-1 space-y-3 overflow-y-auto px-1">
        {navigationGroups.map((group) => {
          const GroupIcon = group.icon;
          const active = isGroupActive(group.items);
          const collapsed = collapsedGroups[group.label] && !active;

          return (
            <div key={group.label}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: active ? 'var(--nav-active-text)' : 'var(--nav-group-text)',
                }}
              >
                <GroupIcon className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    collapsed && '-rotate-90'
                  )}
                />
              </button>

              {/* Group items */}
              {!collapsed && (
                <div className="mt-1 space-y-0.5 pl-2">
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--sidebar-border)' }} className="pt-4 space-y-1">
        <button
          onClick={() => {
            setMobileOpen(false);
            document.dispatchEvent(new CustomEvent('shortcut-show-help'));
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs transition-colors"
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
          <kbd
            className="inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold"
            style={{ borderColor: 'var(--sidebar-border)', color: 'var(--nav-text)' }}
          >
            ?
          </kbd>
          <span>Shortcuts</span>
        </button>
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
        style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative flex h-screen w-64 flex-col px-3 py-4"
            style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 flex h-11 w-11 items-center justify-center rounded"
              style={{ color: 'var(--foreground-secondary)' }}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex h-screen w-64 flex-col px-3 py-4"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
