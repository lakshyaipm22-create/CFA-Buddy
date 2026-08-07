'use client';

import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsNavProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
}

export function TabsNav({ tabs, defaultTab, children }: TabsNavProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--card-border)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{
                color: isActive
                  ? '#C5A258'
                  : isHovered
                    ? 'var(--foreground)'
                    : 'var(--foreground-secondary)',
              }}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A258] rounded-t" />
              )}
            </button>
          );
        })}
      </div>
      {/* Tab content */}
      {children(activeTab)}
    </div>
  );
}
