'use client';

import { useState } from 'react';
import type { AdaptiveState, TopicAbility } from '../types';
import { getMasteryLevel, getMasteryColor } from '../utils/topic-mastery';

interface MasteryOverviewProps {
  state: AdaptiveState;
}

/**
 * Visual display showing per-topic ability levels as a colored grid.
 * Uses Navy/Gold/Green theme colors to indicate mastery progression.
 */
export function MasteryOverview({ state }: MasteryOverviewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const topics = Object.values(state.ability.topicBreakdown);

  if (topics.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
      >
        <p style={{ color: 'var(--foreground-secondary)' }}>
          No adaptive practice data yet. Start a session to see your mastery levels.
        </p>
      </div>
    );
  }

  // Sort topics by subject then by theta
  const sortedTopics = [...topics].sort((a, b) => {
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    return b.theta - a.theta;
  });

  const selectedData = selectedTopic
    ? state.ability.topicBreakdown[selectedTopic]
    : null;

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Overall Ability
            </p>
            <p className="text-2xl font-bold" style={{ color: '#C5A258' }}>
              {state.ability.theta.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Topics Practiced
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              {topics.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Total Questions
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              {state.responseHistory.length}
            </p>
          </div>
        </div>
      </div>

      {/* Topic Grid */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'rgba(0, 43, 92, 0.2)', border: '1px solid rgba(197, 162, 88, 0.1)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          Topic Mastery
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {sortedTopics.map(topic => (
            <button
              key={topic.topic}
              onClick={() => setSelectedTopic(
                selectedTopic === topic.topic ? null : topic.topic
              )}
              className="rounded-lg p-3 text-left transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: `${getMasteryColor(topic.theta)}20`,
                border: selectedTopic === topic.topic
                  ? `2px solid ${getMasteryColor(topic.theta)}`
                  : '1px solid transparent',
              }}
            >
              <div
                className="h-2 w-full rounded-full mb-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(5, ((topic.theta + 1.5) / 3.5) * 100))}%`,
                    backgroundColor: getMasteryColor(topic.theta),
                  }}
                />
              </div>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {topic.topic}
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {getMasteryLevel(topic.theta)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Topic Details */}
      {selectedData && (
        <TopicDetail topic={selectedData} />
      )}
    </div>
  );
}

function TopicDetail({ topic }: { topic: TopicAbility }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(0, 43, 92, 0.3)',
        border: `1px solid ${getMasteryColor(topic.theta)}40`,
      }}
    >
      <h4 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
        {topic.topic}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Ability</p>
          <p className="text-lg font-bold" style={{ color: getMasteryColor(topic.theta) }}>
            {topic.theta.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Level</p>
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {getMasteryLevel(topic.theta)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Accuracy</p>
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {(topic.accuracy * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Questions</p>
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {topic.questionsAnswered}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Subject: {topic.subject} | Confidence: ±{topic.standardError.toFixed(2)} |
          Last practiced: {new Date(topic.lastUpdated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
