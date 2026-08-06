'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Award, BarChart3, Crosshair } from 'lucide-react';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import { computeReadiness, type SubjectReadiness } from '../utils/readiness-calculator';

const RadarChart = dynamic(() => import('recharts').then(m => m.RadarChart), { ssr: false });
const Radar = dynamic(() => import('recharts').then(m => m.Radar), { ssr: false });
const PolarGrid = dynamic(() => import('recharts').then(m => m.PolarGrid), { ssr: false });
const PolarAngleAxis = dynamic(() => import('recharts').then(m => m.PolarAngleAxis), { ssr: false });
const PolarRadiusAxis = dynamic(() => import('recharts').then(m => m.PolarRadiusAxis), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

interface ReadinessDashboardProps {
  attempts: PracticeAttempt[];
}

export function ReadinessDashboard({ attempts }: ReadinessDashboardProps) {
  const readiness = useMemo(() => computeReadiness(attempts), [attempts]);

  if (readiness.subjects.length === 0) return null;

  const subjectsWithData = readiness.subjects.filter(s => s.questionsAttempted > 0);
  if (subjectsWithData.length === 0) return null;

  // Radar chart data
  const radarData = readiness.subjects.map(s => ({
    subject: abbreviateSubject(s.subject),
    fullName: s.subject,
    accuracy: s.accuracy,
    coverage: Math.min(s.coverage, 100),
  }));

  // Subjects below MPS (70%)
  const subjectsBelowMPS = subjectsWithData
    .filter(s => s.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy);

  // 3 weakest subjects for module breakdown
  const weakestSubjects = [...subjectsWithData]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Header: Overall Readiness Score */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8">
          {/* Score Gauge */}
          <div className="flex flex-col items-center">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full border-4"
              style={{
                borderColor: getScoreColor(readiness.overallScore),
                background: 'var(--nav-hover-bg)',
              }}
            >
              <div className="text-center">
                <span
                  className="text-3xl font-bold"
                  style={{ color: getScoreColor(readiness.overallScore) }}
                >
                  {readiness.overallScore}%
                </span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                  Weighted Score
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Exam Readiness
            </p>
          </div>

          {/* Summary Stats */}
          <div className="flex-1 grid grid-cols-2 gap-3 md:grid-cols-3">
            <MiniStat
              label="Pass Estimate"
              value={`${readiness.passEstimate}%`}
              icon={<Award className="h-4 w-4" />}
              color="#C5A258"
            />
            <MiniStat
              label="Gap from MPS"
              value={readiness.gapFromMPS === 0 ? 'None' : `${readiness.gapFromMPS}%`}
              icon={<Crosshair className="h-4 w-4" />}
              color={readiness.gapFromMPS > 0 ? '#ef4444' : '#00843D'}
            />
            <MiniStat
              label="Subjects Practiced"
              value={`${subjectsWithData.length}/10`}
              icon={<BarChart3 className="h-4 w-4" />}
              color="#002B5C"
            />
          </div>
        </div>
      </div>

      {/* Radar Chart + Subject Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Radar Chart */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Subject Strength Radar
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="var(--card-border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'var(--foreground-secondary)', fontSize: 10 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'var(--foreground-secondary)', fontSize: 9 }}
              />
              <Radar
                name="Accuracy"
                dataKey="accuracy"
                stroke="#C5A258"
                fill="#C5A258"
                fillOpacity={0.3}
              />
              <Radar
                name="Coverage"
                dataKey="coverage"
                stroke="#002B5C"
                fill="#002B5C"
                fillOpacity={0.15}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-Subject Cards */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Per-Subject Readiness
          </h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {readiness.subjects.map(s => (
              <SubjectCard key={s.subject} data={s} />
            ))}
          </div>
        </div>
      </div>

      {/* Gap Analysis: Subjects Below MPS */}
      {subjectsBelowMPS.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
            Readiness Gap (Subjects Below 70% MPS)
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subjectsBelowMPS.map(s => (
              <div
                key={s.subject}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--card-border)', background: 'var(--nav-hover-bg)' }}
              >
                <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {s.subject}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold" style={{ color: '#ef4444' }}>
                    {s.accuracy}%
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                    Gap: {70 - s.accuracy}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full" style={{ background: 'var(--card-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.accuracy}%`, background: '#ef4444' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module-Level Breakdown for Weakest Subjects */}
      {weakestSubjects.length > 0 && weakestSubjects.some(s => s.weakModules.length > 0) && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Module Breakdown (Weakest Subjects)
          </h3>
          <div className="space-y-4">
            {weakestSubjects
              .filter(s => s.weakModules.length > 0)
              .map(s => (
                <div key={s.subject}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#C5A258' }}>
                    {s.subject} ({s.accuracy}% overall)
                  </p>
                  <div className="space-y-1">
                    {s.weakModules.map(m => (
                      <div
                        key={m.name}
                        className="flex items-center gap-2 rounded-md px-2 py-1"
                        style={{ background: 'var(--nav-hover-bg)' }}
                      >
                        <span
                          className="text-[10px] flex-1 truncate"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {m.name}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                          {m.score}/{m.total}
                        </span>
                        <span
                          className="text-[10px] font-medium w-8 text-right"
                          style={{ color: m.percentage < 60 ? '#ef4444' : '#C5A258' }}
                        >
                          {m.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectCard({ data }: { data: SubjectReadiness }) {
  const hasData = data.questionsAttempted > 0;
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{ background: 'var(--nav-hover-bg)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
            {data.subject}
          </p>
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            style={{ background: '#002B5C', color: '#C5A258' }}
          >
            {Math.round(data.examWeight * 100)}%
          </span>
        </div>
        {hasData && (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--card-border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(data.coverage, 100)}%`,
                  background: '#002B5C',
                }}
              />
            </div>
            <span className="text-[9px] shrink-0" style={{ color: 'var(--foreground-secondary)' }}>
              {data.questionsAttempted}/{data.questionsAvailable} Qs
            </span>
          </div>
        )}
      </div>
      <span
        className="text-sm font-bold shrink-0"
        style={{ color: hasData ? getScoreColor(data.accuracy) : 'var(--foreground-secondary)' }}
      >
        {hasData ? `${data.accuracy}%` : '--'}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{ borderColor: 'var(--card-border)', background: 'var(--nav-hover-bg)' }}
    >
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
          {label}
        </span>
      </div>
      <p className="mt-1 text-sm font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#00843D';
  if (score >= 60) return '#C5A258';
  return '#ef4444';
}

function abbreviateSubject(name: string): string {
  const abbreviations: Record<string, string> = {
    'Quantitative Methods': 'Quant',
    'Economics': 'Econ',
    'Corporate Issuers': 'Corp Iss',
    'Financial Statement Analysis': 'FSA',
    'Equity Investments': 'Equity',
    'Fixed Income': 'FI',
    'Derivatives': 'Deriv',
    'Alternative Investments': 'Alts',
    'Portfolio Management': 'PM',
    'Ethical and Professional Standards': 'Ethics',
  };
  return abbreviations[name] ?? name;
}
