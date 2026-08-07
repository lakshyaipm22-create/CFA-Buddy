'use client';

import { AlertTriangle, Brain, Calculator, Clock, Target } from 'lucide-react';
import type { MistakePattern } from '../types';

interface PatternCardProps {
  pattern: MistakePattern;
}

const patternIcons: Record<MistakePattern['patternType'], typeof Brain> = {
  conceptConfusion: Brain,
  framingTrap: Target,
  calculationError: Calculator,
  timePressure: Clock,
  confidenceMismatch: AlertTriangle,
};

const patternLabels: Record<MistakePattern['patternType'], string> = {
  conceptConfusion: 'Concept Confusion',
  framingTrap: 'Framing Trap',
  calculationError: 'Calculation Error',
  timePressure: 'Time Pressure',
  confidenceMismatch: 'Confidence Mismatch',
};

const severityColors: Record<MistakePattern['severity'], { bg: string; text: string; border: string }> = {
  high: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  medium: { bg: 'rgba(197, 162, 88, 0.1)', text: '#C5A258', border: 'rgba(197, 162, 88, 0.3)' },
  low: { bg: 'rgba(0, 132, 61, 0.1)', text: '#00843D', border: 'rgba(0, 132, 61, 0.3)' },
};

export function PatternCard({ pattern }: PatternCardProps) {
  const Icon = patternIcons[pattern.patternType];
  const label = patternLabels[pattern.patternType];
  const colors = severityColors[pattern.severity];

  return (
    <div
      className="rounded-xl border p-5 transition-all hover:border-opacity-60"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: colors.bg }}
          >
            <Icon size={20} style={{ color: colors.text }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {label}
            </h3>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {pattern.occurrenceCount} occurrence{pattern.occurrenceCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {pattern.severity}
        </span>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
        {pattern.description}
      </p>

      {/* Affected Topics */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {pattern.affectedTopics.slice(0, 4).map((topic) => (
          <span
            key={topic}
            className="rounded-md px-2 py-0.5 text-xs"
            style={{ background: 'rgba(0, 43, 92, 0.3)', color: '#93a3b8' }}
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Examples */}
      {pattern.examples.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            Examples:
          </p>
          {pattern.examples.slice(0, 2).map((example) => (
            <div
              key={example.questionId}
              className="rounded-md border px-3 py-2 text-xs"
              style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
            >
              <p className="truncate" style={{ color: 'var(--foreground-secondary)' }}>
                {example.questionText}
              </p>
              <p className="mt-0.5">
                <span style={{ color: '#ef4444' }}>You: {example.selectedAnswer}</span>
                {' | '}
                <span style={{ color: '#00843D' }}>Correct: {example.correctAnswer}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div
        className="rounded-lg border px-3 py-2"
        style={{ borderColor: 'rgba(197, 162, 88, 0.2)', background: 'rgba(197, 162, 88, 0.05)' }}
      >
        <p className="text-xs" style={{ color: '#C5A258' }}>
          {pattern.recommendation}
        </p>
      </div>
    </div>
  );
}
