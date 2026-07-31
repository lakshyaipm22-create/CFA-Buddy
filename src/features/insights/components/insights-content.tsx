'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, Target, Clock } from 'lucide-react';
import { useLocalStorageSessions } from '@/features/dashboard/hooks/use-local-storage-sessions';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';
import { TopicHeatmap } from './topic-heatmap';
import {
  WeakTopicPanel,
  ProgressTimelineChart,
  GapAnalysis,
  TargetSetter,
  getAttempts,
} from '@/shared/analytics';
import type { PracticeAttempt, Question } from '@/shared/analytics';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

const SUBJECT_COLORS = [
  '#002B5C', '#C5A258', '#00843D', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#10b981', '#6366f1',
];

export function InsightsContent() {
  const sessions = useLocalStorageSessions();

  // Load all attempts from localStorage for weak topic analysis
  const [allAttempts] = useState<PracticeAttempt[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('cfa-buddy-attempts');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  const data = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'completed');
    if (completed.length === 0) return null;

    // Per-subject stats
    const bySubject: Record<string, { correct: number; total: number; timeSpent: number }> = {};

    for (const session of completed) {
      for (const attempt of session.attempts ?? []) {
        const q = sampleQuestions.find(sq => sq.id === attempt.questionId);
        const subject = q?.subject ?? 'Unknown';
        if (!bySubject[subject]) bySubject[subject] = { correct: 0, total: 0, timeSpent: 0 };
        bySubject[subject].total++;
        bySubject[subject].timeSpent += attempt.timeSpentSeconds ?? 0;
        if (attempt.correct) bySubject[subject].correct++;
      }
    }

    const subjectEntries = Object.entries(bySubject).map(([name, stats]) => ({
      name: name.split(' ').slice(0, 2).join(' '),
      fullName: name,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total,
      timeMinutes: Math.round(stats.timeSpent / 60),
    }));

    // Most improved / declining
    const sorted = [...subjectEntries].sort((a, b) => b.accuracy - a.accuracy);
    const bestSubject = sorted[0] ?? null;
    const worstSubject = sorted[sorted.length - 1] ?? null;

    // Predicted score (weighted by CFA weights)
    const weights: Record<string, number> = {
      'Ethical and Professional Standards': 15,
      'Quantitative Methods': 10, 'Economics': 10,
      'Financial Statement Analysis': 13, 'Corporate Issuers': 8,
      'Equity Investments': 11, 'Fixed Income': 11,
      'Derivatives': 6, 'Alternative Investments': 6,
      'Portfolio Management': 10,
    };
    let weightedScore = 0, totalWeight = 0;
    for (const entry of subjectEntries) {
      const w = weights[entry.fullName] ?? 10;
      weightedScore += entry.accuracy * w;
      totalWeight += w;
    }
    const predictedScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Days to 90% readiness
    const totalAttempts = subjectEntries.reduce((s, e) => s + e.total, 0);
    const overallAccuracy = totalAttempts > 0
      ? Math.round(subjectEntries.reduce((s, e) => s + e.correct, 0) / totalAttempts * 100)
      : 0;
    const daysToTarget = predictedScore >= 90 ? 0 : Math.max(1, Math.round((90 - predictedScore) * 3));

    // Pie chart data
    const pieData = subjectEntries.filter(e => e.timeMinutes > 0).map(e => ({
      name: e.name, value: e.timeMinutes,
    }));

    return { subjectEntries, bestSubject, worstSubject, predictedScore, daysToTarget, overallAccuracy, pieData };
  }, [sessions]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <Target className="mx-auto h-12 w-12 opacity-30" style={{ color: 'var(--foreground-secondary)' }} />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>No Data Yet</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Complete some question sessions to see your progress insights.
          </p>
        </div>

        {/* Topic Heatmap - shown even without session data */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Topic Performance Heatmap
          </h3>
          <TopicHeatmap />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Timeline */}
      {allAttempts.length > 0 && (
        <ProgressTimelineChart attempts={allAttempts} />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricBox icon={<Target className="h-5 w-5" />} label="Predicted Score" value={`${data.predictedScore}%`} color="#C5A258" />
        <MetricBox icon={<Clock className="h-5 w-5" />} label="Days to 90%" value={data.daysToTarget === 0 ? 'Achieved!' : `~${data.daysToTarget} days`} color="#002B5C" />
        <MetricBox icon={<TrendingUp className="h-5 w-5" />} label="Strongest" value={data.bestSubject?.name ?? '--'} color="#00843D" />
        <MetricBox icon={<TrendingDown className="h-5 w-5" />} label="Needs Work" value={data.worstSubject?.name ?? '--'} color="#ef4444" />
      </div>

      {/* Time Spent Pie Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Time Spent by Subject</h3>
          {data.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" stroke="none">
                  {data.pieData.map((_, idx) => (
                    <Cell key={idx} fill={SUBJECT_COLORS[idx % SUBJECT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-8" style={{ color: 'var(--foreground-secondary)' }}>No time data yet</p>
          )}
        </div>

        {/* Subject Accuracy Table */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Subject Accuracy</h3>
          <div className="space-y-2">
            {data.subjectEntries.sort((a, b) => a.accuracy - b.accuracy).map((entry, idx) => (
              <div key={entry.fullName} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ background: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }} />
                <p className="flex-1 text-xs truncate" style={{ color: 'var(--foreground)' }}>{entry.name}</p>
                <div className="w-20">
                  <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--nav-hover-bg)' }}>
                    <div className="h-full rounded-full" style={{ width: `${entry.accuracy}%`, background: entry.accuracy > 70 ? '#00843D' : entry.accuracy > 50 ? '#C5A258' : '#ef4444' }} />
                  </div>
                </div>
                <span className="text-xs w-8 text-right" style={{ color: 'var(--foreground-secondary)' }}>{entry.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Topic Performance Heatmap */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Topic Performance Heatmap
        </h3>
        <TopicHeatmap />
      </div>

      {/* Weak Topic Deep Dive */}
      {allAttempts.length > 0 && (
        <WeakTopicPanel attempts={allAttempts} questions={sampleQuestions as Question[]} />
      )}

      {/* Gap Analysis */}
      {allAttempts.length > 0 && (
        <GapAnalysis attempts={allAttempts} />
      )}

      {/* Target Setter (collapsible) */}
      {allAttempts.length > 0 && (
        <TargetSetter attempts={allAttempts} />
      )}
    </div>
  );
}

function MetricBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center gap-2" style={{ color }}>{icon}<span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{label}</span></div>
      <p className="mt-2 text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
