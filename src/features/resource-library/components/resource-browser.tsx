'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ContentMetadata } from '@/features/content-scanner/types';
import type { GroupedResources } from '../queries/get-resources';
import { truncate } from '@/shared/lib/utils';
import { useListNavigation } from '@/shared/hooks/use-list-navigation';

interface ResourceBrowserProps {
  subjects: string[];
  initialResources: GroupedResources;
}

export function ResourceBrowser({ subjects, initialResources }: ResourceBrowserProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'subject' | 'provider' | 'type'>('subject');

  const displayGroups = viewMode === 'subject'
    ? (selectedSubject ? { [selectedSubject]: initialResources.bySubject[selectedSubject] ?? [] } : initialResources.bySubject)
    : viewMode === 'provider'
      ? initialResources.byProvider
      : initialResources.byType;

  // Flatten all visible resources for j/k navigation
  const flatResources = Object.entries(displayGroups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .flatMap(([, resources]) => resources);

  const { focusedIndex, listRef } = useListNavigation(flatResources.length);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(['subject', 'provider', 'type'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              By {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {viewMode === 'subject' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedSubject ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedSubject === subject ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resource List with j/k navigation */}
      <div ref={listRef} className="space-y-8">
        {(() => {
          const sorted = Object.entries(displayGroups).sort((a, b) => a[0].localeCompare(b[0]));
          const startIndices: number[] = [];
          let acc = 0;
          for (const [, resources] of sorted) {
            startIndices.push(acc);
            acc += resources.length;
          }
          return sorted.map(([groupName, resources], groupIdx) => (
            <ResourceGroup
              key={groupName}
              name={groupName}
              resources={resources}
              focusedIndex={focusedIndex}
              startIndex={startIndices[groupIdx]}
            />
          ));
        })()}
      </div>

      {Object.keys(displayGroups).length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-zinc-400">No resources found. Run the content scanner first.</p>
        </div>
      )}
    </div>
  );
}

function ResourceGroup({ name, resources, focusedIndex, startIndex }: { name: string; resources: ContentMetadata[]; focusedIndex: number; startIndex: number }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-white">{formatGroupName(name)}</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource, i) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            isFocused={focusedIndex === startIndex + i}
          />
        ))}
      </div>
    </div>
  );
}

function ResourceCard({ resource, isFocused }: { resource: ContentMetadata; isFocused: boolean }) {
  const sizeStr = resource.fileSize > 1024 * 1024
    ? `${(resource.fileSize / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(resource.fileSize / 1024)} KB`;

  return (
    <Link
      href={`/resources/${resource.id}`}
      data-list-item
      className={`group flex flex-col rounded-lg border p-4 transition-colors ${
        isFocused
          ? 'border-[#C5A258] bg-zinc-900 ring-1 ring-[#C5A258]/50'
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
          {truncate(resource.fileName, 60)}
        </p>
        <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
          {formatResourceType(resource.resourceType)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
        {resource.provider && <span>{resource.provider}</span>}
        {resource.subject && <span>• {resource.subject}</span>}
        <span>• {sizeStr}</span>
      </div>
      {resource.reading && (
        <p className="mt-1 text-xs text-zinc-600">{truncate(resource.reading, 50)}</p>
      )}
    </Link>
  );
}

function formatGroupName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatResourceType(type: string): string {
  const map: Record<string, string> = {
    'curriculum': 'Curriculum',
    'schweser-notes': 'Schweser',
    'ift-notes': 'IFT',
    'mark-meldrum-notes': 'Mark Meldrum',
    'fintree-notes': 'Fintree',
    'question-bank': 'QB',
    'answer-key': 'Answers',
    'mock-exam': 'Mock',
    'formula-sheet': 'Formula',
    'unknown': 'Other',
  };
  return map[type] ?? type;
}
