'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ContentMetadata } from '@/features/content-scanner/types';
import type { GroupedResources } from '../queries/get-resources';
import { truncate } from '@/shared/lib/utils';
import { useListNavigation } from '@/shared/hooks/use-list-navigation';
import { useCursorPagination } from '@/shared/hooks/use-cursor-pagination';

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

  const { visibleItems: paginatedResources, hasMore, loadMore } = useCursorPagination({
    items: flatResources,
    pageSize: 20,
    getCursor: (item) => item.id,
  });

  const { focusedIndex, listRef } = useListNavigation(paginatedResources.length);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex gap-1 rounded-lg border p-1"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          {(['subject', 'provider', 'type'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === mode ? 'var(--border)' : 'transparent',
                color: viewMode === mode ? 'var(--foreground)' : 'var(--foreground-secondary)',
              }}
            >
              By {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {viewMode === 'subject' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject(null)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: !selectedSubject ? 'var(--accent-primary)' : 'var(--nav-hover-bg)',
                color: !selectedSubject ? '#ffffff' : 'var(--foreground-secondary)',
              }}
            >
              All
            </button>
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: selectedSubject === subject ? 'var(--accent-primary)' : 'var(--nav-hover-bg)',
                  color: selectedSubject === subject ? '#ffffff' : 'var(--foreground-secondary)',
                }}
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
          // Re-group paginated resources maintaining order
          const groupedPaginated: Record<string, ContentMetadata[]> = {};
          for (const resource of paginatedResources) {
            const groupKey = viewMode === 'subject'
              ? (resource.subject ?? 'Unknown')
              : viewMode === 'provider'
                ? (resource.provider ?? 'Unknown')
                : (resource.resourceType ?? 'unknown');
            if (!groupedPaginated[groupKey]) groupedPaginated[groupKey] = [];
            groupedPaginated[groupKey].push(resource);
          }

          const sorted = Object.entries(groupedPaginated).sort((a, b) => a[0].localeCompare(b[0]));
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

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="rounded-lg bg-[#002B5C] px-6 py-2.5 text-sm font-medium text-[#C5A258] transition-all hover:opacity-90"
          >
            Load More ({flatResources.length - paginatedResources.length} remaining)
          </button>
        </div>
      )}

      {Object.keys(displayGroups).length === 0 && (
        <div
          className="rounded-lg border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No resources found. Run the content scanner first.</p>
        </div>
      )}
    </div>
  );
}

function ResourceGroup({ name, resources, focusedIndex, startIndex }: { name: string; resources: ContentMetadata[]; focusedIndex: number; startIndex: number }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{formatGroupName(name)}</h2>
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
        isFocused ? 'ring-1 ring-[#C5A258]/50' : ''
      }`}
      style={{
        borderColor: isFocused ? '#C5A258' : 'var(--card-border)',
        background: 'var(--card-bg)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {truncate(resource.fileName, 60)}
        </p>
        <span
          className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
        >
          {formatResourceType(resource.resourceType)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
        {resource.provider && <span>{resource.provider}</span>}
        {resource.subject && <span>• {resource.subject}</span>}
        <span>• {sizeStr}</span>
      </div>
      {resource.reading && (
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>{truncate(resource.reading, 50)}</p>
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
