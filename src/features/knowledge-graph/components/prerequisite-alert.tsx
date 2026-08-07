'use client';

/**
 * Prerequisite Alert - explains why a student struggles with a topic
 * based on unmastered prerequisite concepts.
 */

import type { WeakPrerequisite } from '../types';

interface PrerequisiteAlertProps {
  targetNodeName: string;
  weakPrerequisites: WeakPrerequisite[];
}

export function PrerequisiteAlert({ targetNodeName, weakPrerequisites }: PrerequisiteAlertProps) {
  if (weakPrerequisites.length === 0) return null;

  const primaryWeakPrereq = weakPrerequisites[0];
  const additionalCount = weakPrerequisites.length - 1;

  return (
    <div
      className="rounded-lg border-l-4 p-4"
      style={{
        borderLeftColor: '#DC2626',
        background: 'rgba(220, 38, 38, 0.08)',
        borderColor: 'var(--card-border)',
      }}
      role="alert"
      aria-label={`Prerequisite alert for ${targetNodeName}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2L18 17H2L10 2Z"
              stroke="#DC2626"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M10 8V11" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="10" cy="13.5" r="0.75" fill="#DC2626" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            You may struggle with{' '}
            <span style={{ color: '#C5A258' }}>{targetNodeName}</span>{' '}
            because you have not mastered{' '}
            <span style={{ color: '#DC2626' }}>{primaryWeakPrereq.nodeName}</span>
            {additionalCount > 0 && (
              <span>
                {' '}and {additionalCount} other prerequisite{additionalCount > 1 ? 's' : ''}
              </span>
            )}
          </p>

          {weakPrerequisites.length > 1 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                Weak prerequisites:
              </p>
              <ul className="space-y-1">
                {weakPrerequisites.map((wp) => (
                  <li key={wp.nodeId} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          wp.masteryLevel === 'weak' ? '#DC2626' : '#4B5563',
                      }}
                    />
                    <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                      {wp.nodeName}
                      {wp.mastery > 0 && (
                        <span className="ml-1 opacity-70">({wp.mastery}% mastery)</span>
                      )}
                      {wp.masteryLevel === 'untouched' && (
                        <span className="ml-1 opacity-70">(not started)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Strengthen these foundations first for better understanding of {targetNodeName}.
          </p>
        </div>
      </div>
    </div>
  );
}
