'use client';

/**
 * Study Path - renders recommended learning path as a vertical timeline.
 * Shows next concepts to tackle in priority order with prerequisites status.
 */

import type { StudyPathRecommendation, NodeMasteryStatus } from '../types';
import { getMasteryLevel } from '../types';

interface StudyPathProps {
  recommendations: StudyPathRecommendation[];
  masteryMap: Map<string, NodeMasteryStatus>;
}

export function StudyPath({ recommendations, masteryMap }: StudyPathProps) {
  if (recommendations.length === 0) {
    return (
      <div
        className="rounded-lg border p-6 text-center"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          All concepts mastered! Keep practicing to maintain your knowledge.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
        Recommended Study Path
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--foreground-secondary)' }}>
        Concepts ordered by readiness and impact on your overall progress
      </p>

      <div className="relative">
        {/* Timeline line */}
        <div
          className="absolute left-4 top-6 bottom-6 w-0.5"
          style={{ backgroundColor: 'var(--card-border)' }}
        />

        <ol className="space-y-4 relative">
          {recommendations.map((rec, index) => {
            const mastery = masteryMap.get(rec.nodeId);
            const level = getMasteryLevel(
              mastery?.mastery ?? 0,
              mastery?.questionsAnswered ?? 0
            );

            return (
              <li key={rec.nodeId} className="flex items-start gap-4 pl-1">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: rec.prerequisitesSatisfied ? '#002B5C' : '#1F2937',
                      color: rec.prerequisitesSatisfied ? '#C5A258' : '#6B7280',
                      border: `2px solid ${rec.prerequisitesSatisfied ? '#C5A258' : '#374151'}`,
                    }}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {rec.nodeName}
                    </span>
                    {rec.prerequisitesSatisfied && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: '#00843D', color: '#ffffff' }}
                      >
                        Ready
                      </span>
                    )}
                    {!rec.prerequisitesSatisfied && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: '#374151', color: '#9CA3AF' }}
                      >
                        Prerequisites needed
                      </span>
                    )}
                    {level === 'partial' && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: '#C5A258', color: '#0a0e14' }}
                      >
                        In progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#C5A258' }}>
                    {rec.subject}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                    {rec.reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
