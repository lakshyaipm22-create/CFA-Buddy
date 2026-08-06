'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ContentMetadata } from '@/features/content-scanner/types';
import { truncate } from '@/shared/lib/utils';
import { PersonalNotes } from './personal-notes';
import type { TopicInfo } from '../queries/hierarchy';

interface ReadingWorkspaceProps {
  subject: string;
  reading: string;
  resources: ContentMetadata[];
  topics?: TopicInfo[];
}

export function ReadingWorkspace({ subject, reading, resources, topics = [] }: ReadingWorkspaceProps) {
  const providers = [...new Set(resources.map(r => r.provider).filter(Boolean) as string[])];
  const [activeTab, setActiveTab] = useState<string>(topics.length > 0 ? 'topics' : (providers[0] ?? 'notes'));

  const allTabs = topics.length > 0 ? ['topics', ...providers, 'notes'] : [...providers, 'notes'];
  const filteredResources = activeTab === 'notes' || activeTab === 'topics'
    ? []
    : resources.filter(r => r.provider === activeTab);

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/learn" className="hover:text-zinc-300 transition-colors">Level I</Link>
        <span className="text-zinc-700">/</span>
        <Link href={`/learn/${encodeURIComponent(subject)}`} className="hover:text-zinc-300 transition-colors">{subject}</Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">{reading}</span>
      </nav>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 pb-px">
        {allTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[#C5A258] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === 'notes' ? 'My Notes' : tab === 'topics' ? 'Topics' : formatProvider(tab)}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'topics' ? (
        <div className="space-y-2">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">{topic.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">LOS: {topic.losCode}</p>
              </div>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                #{topic.sortOrder}
              </span>
            </div>
          ))}
          {topics.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">No topics defined for this reading yet.</p>
          )}
        </div>
      ) : activeTab === 'notes' ? (
        <PersonalNotes subject={subject} reading={reading} />
      ) : (
        <div className="space-y-2">
          {filteredResources.map((resource) => (
            <Link
              key={resource.id}
              href={`/resources/${resource.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">{truncate(resource.fileName, 70)}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {resource.resourceType} {'\u2022'} {formatFileSize(resource.fileSize)}
                </p>
              </div>
              <span className="text-xs text-zinc-600">View {'\u2192'}</span>
            </Link>
          ))}
          {filteredResources.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">No resources from this provider for this reading.</p>
          )}
        </div>
      )}

      {/* Quick Topic Test */}
      <div className="mt-6 border-t border-zinc-800 pt-4">
        <Link
          href={`/questions?subject=${encodeURIComponent(subject)}`}
          className="inline-block rounded-lg bg-[#002B5C] px-4 py-2 text-sm font-medium text-[#C5A258] transition-colors hover:bg-[#003875]"
        >
          Quick Topic Test (10 questions)
        </Link>
      </div>
    </div>
  );
}

function formatProvider(provider: string): string {
  const map: Record<string, string> = {
    'curriculum': 'Curriculum',
    'schweser': 'Schweser',
    'ift': 'IFT',
    'mark-meldrum': 'Mark Meldrum',
    'fintree': 'Fintree',
    'uworld': 'UWorld',
    '25th-hour': '25th Hour',
    'personal': 'Personal',
  };
  return map[provider] ?? provider;
}

function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
