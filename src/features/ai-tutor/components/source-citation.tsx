'use client';

import type { SourceReference } from '../types';

interface SourceCitationProps {
  sources: SourceReference[];
}

function getSourceIcon(type: SourceReference['type']): string {
  switch (type) {
    case 'formula':
      return 'f(x)';
    case 'question':
      return 'Q';
    case 'concept':
      return 'C';
  }
}

function getSourceColor(type: SourceReference['type']): string {
  switch (type) {
    case 'formula':
      return '#C5A258';
    case 'question':
      return '#00843D';
    case 'concept':
      return '#002B5C';
  }
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <span
          key={`${source.type}-${source.id}`}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${getSourceColor(source.type)}15`,
            color: getSourceColor(source.type),
            border: `1px solid ${getSourceColor(source.type)}30`,
          }}
        >
          <span className="font-mono text-[10px]">{getSourceIcon(source.type)}</span>
          {source.title}
        </span>
      ))}
    </div>
  );
}
