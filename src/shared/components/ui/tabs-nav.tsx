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

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-primary)] mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-[#C5A258]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A258] rounded-t" />
            )}
          </button>
        ))}
      </div>
      {/* Tab content */}
      {children(activeTab)}
    </div>
  );
}
