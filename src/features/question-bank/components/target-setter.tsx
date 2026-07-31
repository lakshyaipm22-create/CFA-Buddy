'use client';

import { useState, useCallback } from 'react';
import { Target, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { getTargets, setTarget, getExamDate, setExamDate } from '../utils/target-storage';
import type { PracticeAttempt } from '../types/attempt';

interface TargetSetterProps {
  attempts: PracticeAttempt[];
}

export function TargetSetter({ attempts }: TargetSetterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    return getTargets();
  });
  const [examDateValue, setExamDateValue] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return getExamDate() ?? '';
  });

  // Get module list from the most recent attempt
  const moduleNames = (() => {
    if (attempts.length === 0) return [];
    const sorted = [...attempts].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const latest = sorted[0];
    return latest.moduleResults.map(m => m.moduleName);
  })();

  const handleTargetChange = useCallback((module: string, value: number) => {
    const clamped = Math.max(50, Math.min(100, value));
    setTarget(module, clamped);
    setTargets(prev => ({ ...prev, [module]: clamped }));
  }, []);

  const handleExamDateChange = useCallback((date: string) => {
    setExamDate(date);
    setExamDateValue(date);
  }, []);

  if (moduleNames.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      {/* Header - always visible, acts as toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
        style={{ color: 'var(--foreground)' }}
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: '#C5A258' }} />
          <span className="text-sm font-semibold">Target Settings</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Exam Date Picker */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
            <label className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Exam Date:</label>
            <input
              type="date"
              value={examDateValue}
              onChange={(e) => handleExamDateChange(e.target.value)}
              className="text-xs px-2 py-1 rounded-md border"
              style={{
                background: 'var(--nav-hover-bg)',
                borderColor: 'var(--card-border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Module Targets */}
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Set target percentages per module (50-100%):
            </p>
            {moduleNames.map(moduleName => (
              <div key={moduleName} className="flex items-center gap-3">
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--foreground)' }}>
                  {moduleName}
                </span>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={targets[moduleName] ?? 80}
                  onChange={(e) => handleTargetChange(moduleName, parseInt(e.target.value) || 80)}
                  className="w-16 text-xs px-2 py-1 rounded-md border text-center"
                  style={{
                    background: 'var(--nav-hover-bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--foreground)',
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
