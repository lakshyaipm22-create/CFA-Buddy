'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Clock,
  Trophy,
  Hash,
  BookOpen,
} from 'lucide-react';
import { CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';

interface SessionData {
  status: string;
  mode?: string;
  startedAt?: string;
  completedAt?: string | null;
  config?: {
    subject?: string;
    timeLimit?: number | null;
    [key: string]: unknown;
  };
  attempts?: Array<{
    correct: boolean;
    timestamp?: string;
    questionId?: string;
    confidence?: string;
    timeSpentSeconds?: number;
  }>;
}

export function AdvancedAnalytics() {
  const [sessions] = useState<SessionData[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SessionData[];
    } catch {
      return [];
    }
  });

  const analytics = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    let totalQuestions = 0;
    let totalTimeSeconds = 0;
    let totalStudyMinutes = 0;

    const subjectStats: Record<string, { correct: number; total: number }> = {};

    for (const session of completedSessions) {
      const configSubject = session.config?.subject ?? 'General';
      const subjects = configSubject.split(',').map((s) => s.trim());

      // Compute study time from session duration
      if (session.startedAt && session.completedAt) {
        const start = new Date(session.startedAt).getTime();
        const end = new Date(session.completedAt).getTime();
        if (end > start) {
          totalStudyMinutes += (end - start) / 60000;
        }
      }

      for (const attempt of session.attempts ?? []) {
        totalQuestions++;
        totalTimeSeconds += attempt.timeSpentSeconds ?? 0;

        // Attribute to first subject if single
        const subj = subjects.length === 1 ? subjects[0] : configSubject;
        if (!subjectStats[subj]) {
          subjectStats[subj] = { correct: 0, total: 0 };
        }
        subjectStats[subj].total++;
        if (attempt.correct) {
          subjectStats[subj].correct++;
        }
      }
    }

    // Average time per question
    const avgTimePerQuestion =
      totalQuestions > 0
        ? Math.round(totalTimeSeconds / totalQuestions)
        : 0;

    // Estimated exam score (weighted by CFA subject weights)
    let estimatedExamScore = 0;
    let totalWeight = 0;
    for (const [subject, weight] of Object.entries(CFA_CURRICULUM_WEIGHTS)) {
      const stats = subjectStats[subject];
      if (stats && stats.total > 0) {
        const accuracy = stats.correct / stats.total;
        estimatedExamScore += accuracy * weight;
        totalWeight += weight;
      }
    }
    if (totalWeight > 0) {
      estimatedExamScore = Math.round((estimatedExamScore / totalWeight) * 100);
    }

    // Strongest topics (top 5 by accuracy, min 3 questions)
    const sortedSubjects = Object.entries(subjectStats)
      .filter(([, s]) => s.total >= 3)
      .map(([name, s]) => ({
        name,
        accuracy: Math.round((s.correct / s.total) * 100),
        total: s.total,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const strongestTopics = sortedSubjects.slice(0, 5);

    // Total study hours
    const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

    return {
      estimatedExamScore,
      avgTimePerQuestion,
      strongestTopics,
      totalQuestions,
      totalStudyHours,
    };
  }, [sessions]);

  if (analytics.totalQuestions === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3
        className="text-sm font-semibold"
        style={{ color: 'var(--foreground)' }}
      >
        Advanced Analytics
      </h3>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <AnalyticCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Est. Exam Score"
          value={analytics.estimatedExamScore > 0 ? `${analytics.estimatedExamScore}%` : '--'}
          color="#C5A258"
          description="Weighted by CFA subject weights"
        />
        <AnalyticCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Time/Question"
          value={`${analytics.avgTimePerQuestion}s`}
          color="#06b6d4"
          description="Average seconds per question"
        />
        <AnalyticCard
          icon={<Hash className="h-4 w-4" />}
          label="Questions Done"
          value={analytics.totalQuestions.toString()}
          color="#00843D"
          description="Total questions attempted"
        />
        <AnalyticCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Study Hours"
          value={analytics.totalStudyHours.toString()}
          color="#8b5cf6"
          description="Total estimated study time"
        />
        <AnalyticCard
          icon={<Trophy className="h-4 w-4" />}
          label="Passing Target"
          value="72%"
          color={analytics.estimatedExamScore >= 72 ? '#00843D' : '#ef4444'}
          description={
            analytics.estimatedExamScore >= 72 ? 'On track' : 'Below target'
          }
        />
      </div>

      {/* Strongest Topics */}
      {analytics.strongestTopics.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          <p
            className="mb-3 text-xs font-medium"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Strongest Topics (Top 5 by Accuracy)
          </p>
          <div className="space-y-2">
            {analytics.strongestTopics.map((topic) => (
              <div key={topic.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {topic.name}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: '#00843D' }}
                    >
                      {topic.accuracy}%
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: 'var(--border-primary, #2a2f3e)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${topic.accuracy}%`,
                        background: '#00843D',
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {topic.total}q
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticCard({
  icon,
  label,
  value,
  color,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  description: string;
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: 'var(--card-border)',
        background: 'var(--card-bg)',
      }}
    >
      <div className="flex items-center gap-2">
        <div style={{ color }}>{icon}</div>
        <span
          className="text-[10px] font-medium"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p
        className="mt-0.5 text-[10px]"
        style={{ color: 'var(--foreground-secondary)' }}
      >
        {description}
      </p>
    </div>
  );
}
