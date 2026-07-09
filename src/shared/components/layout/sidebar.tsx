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
    <aside className="flex h-screen w-64 flex-col border-r border-[#1a2332] bg-[#0d1117] px-3 py-4">
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
              // Fallback if logo.png doesn't exist
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002B5C] text-lg font-bold text-[#C5A258]">C</span>';
            }}
          />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">CFA Buddy</h1>
          <p className="text-[10px] text-[#C5A258]">Your CFA Operating System</p>
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#002B5C] text-[#C5A258]'
                  : 'text-zinc-400 hover:bg-[#1a2332] hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#1a2332] pt-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-[#1a2332] hover:text-white"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
