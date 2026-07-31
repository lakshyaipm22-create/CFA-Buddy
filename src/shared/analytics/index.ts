/**
 * Shared analytics components and utilities.
 *
 * These are analytics-focused pieces that originated in the question-bank feature
 * but are consumed by other features (insights, dashboard). Centralizing the exports
 * here makes the cross-feature dependency explicit and auditable per project rules.
 */

// Components
export { WeakTopicPanel } from '@/features/question-bank/components/weak-topic-panel';
export { ProgressTimelineChart } from '@/features/question-bank/components/progress-timeline-chart';
export { GapAnalysis } from '@/features/question-bank/components/gap-analysis';
export { TargetSetter } from '@/features/question-bank/components/target-setter';

// Utilities
export { getAttempts } from '@/features/question-bank/utils/attempt-storage';

// Types
export type { PracticeAttempt } from '@/features/question-bank/types/attempt';
export type { Question } from '@/features/question-bank/types/index';
