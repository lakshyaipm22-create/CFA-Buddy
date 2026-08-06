'use client';

import { useState, useCallback } from 'react';
import {
  HelpCircle,
  Calculator,
  BookOpen,
  Eye,
  Zap,
  Clock,
  X,
} from 'lucide-react';
import { classifyError, createMistakeLog } from '@/shared/actions/mistakes';
import type { ErrorClassification } from '@/features/question-bank/types';

interface ErrorCategory {
  id: ErrorClassification;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ERROR_CATEGORIES: ErrorCategory[] = [
  {
    id: 'DidntKnow',
    label: "Didn't Know",
    description: 'The concept was completely unfamiliar',
    icon: <HelpCircle className="h-5 w-5" />,
    color: '#ef4444',
  },
  {
    id: 'ForgotFormula',
    label: 'Forgot Formula',
    description: 'Knew the concept but forgot the formula',
    icon: <BookOpen className="h-5 w-5" />,
    color: '#f97316',
  },
  {
    id: 'CalculationMistake',
    label: 'Calculation Error',
    description: 'Knew the formula but made a math error',
    icon: <Calculator className="h-5 w-5" />,
    color: '#eab308',
  },
  {
    id: 'MisreadQuestion',
    label: 'Misread Question',
    description: 'Misunderstood what was being asked',
    icon: <Eye className="h-5 w-5" />,
    color: '#8b5cf6',
  },
  {
    id: 'Careless',
    label: 'Careless',
    description: 'Knew the answer but selected wrong option',
    icon: <Zap className="h-5 w-5" />,
    color: '#06b6d4',
  },
  {
    id: 'TimePressure',
    label: 'Time Pressure',
    description: 'Rushed due to time constraints',
    icon: <Clock className="h-5 w-5" />,
    color: '#ec4899',
  },
];

interface ErrorClassifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  questionId: string;
  topicId: string;
  confidence: 'Guess' | 'ThinkSo' | 'Certain';
  onClassified?: (classification: ErrorClassification) => void;
}

export function ErrorClassifyModal({
  isOpen,
  onClose,
  attemptId,
  questionId,
  topicId,
  confidence,
  onClassified,
}: ErrorClassifyModalProps) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ErrorClassification | null>(null);

  const handleClassify = useCallback(
    async (classification: ErrorClassification) => {
      setSelected(classification);
      setLoading(true);

      try {
        // Classify the error on the attempt
        await classifyError({
          attemptId,
          errorClassification: classification,
        });

        // Create a MistakeLog entry
        await createMistakeLog({
          attemptId,
          topicId: topicId || questionId,
          errorClassification: classification,
          confidence,
        });

        // Update localStorage sessions to reflect the classification
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('cfa-buddy-sessions');
          if (raw) {
            try {
              const sessions = JSON.parse(raw) as Array<{
                attempts?: Array<{
                  questionId: string;
                  errorClassification?: string;
                }>;
              }>;
              for (const session of sessions) {
                for (const attempt of session.attempts ?? []) {
                  if (attempt.questionId === questionId && !attempt.errorClassification) {
                    attempt.errorClassification = classification;
                  }
                }
              }
              localStorage.setItem('cfa-buddy-sessions', JSON.stringify(sessions));
            } catch {
              // Ignore parse errors
            }
          }
        }

        onClassified?.(classification);
        onClose();
      } catch {
        // Silently handle - still close the modal
        onClose();
      } finally {
        setLoading(false);
      }
    },
    [attemptId, questionId, topicId, confidence, onClassified, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl"
        style={{
          background: 'var(--card-bg, #1a1f2e)',
          borderColor: 'var(--card-border, #2a2f3e)',
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--foreground, #ffffff)' }}
            >
              What went wrong?
            </h2>
            <p
              className="mt-0.5 text-xs"
              style={{ color: 'var(--foreground-secondary, #9ca3af)' }}
            >
              Classify this error to track your weakness patterns
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
            style={{ color: 'var(--foreground-secondary, #9ca3af)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {ERROR_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleClassify(category.id)}
              disabled={loading}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:scale-[1.02] disabled:opacity-50 ${
                selected === category.id ? 'ring-2' : ''
              }`}
              style={{
                borderColor:
                  selected === category.id ? category.color : 'var(--card-border, #2a2f3e)',
                background:
                  selected === category.id
                    ? `${category.color}15`
                    : 'var(--background-tertiary, #0f1420)',
              }}
            >
              <div style={{ color: category.color }}>{category.icon}</div>
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--foreground, #ffffff)' }}
              >
                {category.label}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{ color: 'var(--foreground-secondary, #9ca3af)' }}
              >
                {category.description}
              </span>
            </button>
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={onClose}
          disabled={loading}
          className="mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--foreground-secondary, #9ca3af)' }}
        >
          Skip classification
        </button>
      </div>
    </div>
  );
}
