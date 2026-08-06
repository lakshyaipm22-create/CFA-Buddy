'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar, TrendingUp, Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CFA_SUBJECTS_ORDERED, CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import { getAllAttempts } from '@/features/question-bank/utils/attempt-storage';
import { getQuestionCountBySubject } from '@/features/question-bank/utils/question-loader';
import type { PracticeAttempt, ModuleResult } from '@/features/question-bank/types/attempt';

export function ExamPlanContent() {
  const [examDate, setExamDate] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cfa-buddy-exam-date');
  });

  const [attempts, setAttempts] = useState<PracticeAttempt[]>(() => {
    if (typeof window === 'undefined') return [];
    return getAllAttempts();
  });

  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    return getQuestionCountBySubject();
  });

  const [inputDate, setInputDate] = useState('');

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'cfa-buddy-exam-date') {
        setExamDate(localStorage.getItem('cfa-buddy-exam-date'));
      }
      if (e.key === 'cfa-buddy-attempts') {
        setAttempts(getAllAttempts());
      }
      if (e.key === 'cfa-buddy-imported-questions') {
        setQuestionCounts(getQuestionCountBySubject());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const saveDate = () => {
    if (!inputDate) return;
    localStorage.setItem('cfa-buddy-exam-date', inputDate);
    setExamDate(inputDate);
    setInputDate('');
  };

  const totalQuestions = useMemo(() => {
    return Object.values(questionCounts).reduce((sum, c) => sum + c, 0);
  }, [questionCounts]);

  // Per-subject statistics from real PracticeAttempt data
  const subjectStats = useMemo(() => {
    const stats: Record<string, { correct: number; total: number; accuracy: number; coverage: number; moduleResults: ModuleResult[] }> = {};

    for (const subject of CFA_SUBJECTS_ORDERED) {
      const subjectAttempts = attempts.filter(a => a.subjectName === subject);
      let correct = 0;
      let total = 0;
      const allModuleResults: ModuleResult[] = [];

      for (const attempt of subjectAttempts) {
        correct += attempt.overallScore;
        total += attempt.overallTotal;
        allModuleResults.push(...attempt.moduleResults);
      }

      const available = questionCounts[subject] ?? 0;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const coverage = available > 0 ? Math.min(100, Math.round((total / available) * 100)) : 0;

      stats[subject] = { correct, total, accuracy, coverage, moduleResults: allModuleResults };
    }

    return stats;
  }, [attempts, questionCounts]);

  // Weighted readiness score using CFA curriculum weights
  const readinessScore = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const subject of CFA_SUBJECTS_ORDERED) {
      const weight = CFA_CURRICULUM_WEIGHTS[subject] ?? 0;
      const stat = subjectStats[subject];
      if (stat && stat.total > 0) {
        weightedSum += weight * stat.accuracy;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }, [subjectStats]);

  const metrics = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const target = new Date(examDate);
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));

    const totalAnswered = attempts.reduce((sum, a) => sum + a.overallTotal, 0);
    const remaining = Math.max(0, totalQuestions - totalAnswered);
    const questionsPerDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
    const progressPct = totalQuestions > 0 ? Math.min(100, Math.round((totalAnswered / totalQuestions) * 100)) : 0;

    // Pacing based on time elapsed vs progress
    const daysElapsed = Math.max(1, 90 - daysLeft);
    const expectedProgress = (daysElapsed / 90) * 100;
    const pacing = progressPct >= expectedProgress * 1.1 ? 'ahead' :
                   progressPct >= expectedProgress * 0.9 ? 'on-track' : 'behind';

    return { daysLeft, questionsPerDay, progressPct, pacing, totalAnswered, remaining };
  }, [examDate, attempts, totalQuestions]);

  // Focus Areas: 3 weakest subjects with module breakdowns
  const focusAreas = useMemo(() => {
    const subjectsWithData = CFA_SUBJECTS_ORDERED
      .filter(s => subjectStats[s] && subjectStats[s].total > 0)
      .map(s => ({
        name: s,
        accuracy: subjectStats[s].accuracy,
        moduleResults: subjectStats[s].moduleResults,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    return subjectsWithData.slice(0, 3).map(subject => {
      // Aggregate module results by module name for this subject
      const moduleMap: Record<string, { score: number; total: number }> = {};
      for (const mr of subject.moduleResults) {
        if (!moduleMap[mr.moduleName]) {
          moduleMap[mr.moduleName] = { score: 0, total: 0 };
        }
        moduleMap[mr.moduleName].score += mr.score;
        moduleMap[mr.moduleName].total += mr.total;
      }

      // Find the weakest modules
      const weakModules = Object.entries(moduleMap)
        .map(([name, data]) => ({
          name,
          score: data.score,
          total: data.total,
          percentage: data.total > 0 ? Math.round((data.score / data.total) * 100) : 0,
        }))
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 3);

      return {
        name: subject.name,
        accuracy: subject.accuracy,
        weakModules,
      };
    });
  }, [subjectStats]);

  if (!examDate) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <Calendar className="mx-auto h-12 w-12 opacity-40" style={{ color: 'var(--foreground-secondary)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Set Your Exam Date</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Set your target exam date to get personalized pacing recommendations.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--background-tertiary)', color: 'var(--foreground)' }}
          />
          <button
            onClick={saveDate}
            disabled={!inputDate}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            Set Date
          </button>
        </div>
      </div>
    );
  }

  const pacingColor = metrics?.pacing === 'ahead' ? '#00843D' : metrics?.pacing === 'on-track' ? '#C5A258' : '#ef4444';
  const pacingLabel = metrics?.pacing === 'ahead' ? 'Ahead of Schedule' : metrics?.pacing === 'on-track' ? 'On Track' : 'Behind Schedule';

  return (
    <div className="space-y-6">
      {/* Countdown + Pacing + Readiness */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <Calendar className="mx-auto h-6 w-6" style={{ color: 'var(--accent-secondary)' }} />
          <p className="mt-3 text-4xl font-bold" style={{ color: 'var(--accent-secondary)' }}>{metrics?.daysLeft}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Days Until Exam</p>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <TrendingUp className="mx-auto h-6 w-6" style={{ color: pacingColor }} />
          <p className="mt-3 text-lg font-bold" style={{ color: pacingColor }}>{pacingLabel}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>{metrics?.progressPct}% of {totalQuestions.toLocaleString()} questions done</p>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <Target className="mx-auto h-6 w-6" style={{ color: 'var(--foreground-secondary)' }} />
          <p className="mt-3 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{metrics?.questionsPerDay}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Questions/Day Target</p>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <CheckCircle2 className="mx-auto h-6 w-6" style={{ color: readinessScore >= 70 ? '#00843D' : readinessScore >= 50 ? '#C5A258' : '#ef4444' }} />
          <p className="mt-3 text-3xl font-bold" style={{ color: readinessScore >= 70 ? '#00843D' : readinessScore >= 50 ? '#C5A258' : '#ef4444' }}>
            {readinessScore > 0 ? `${readinessScore}%` : '--'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Weighted Readiness</p>
        </div>
      </div>

      {/* Daily Targets */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Daily Study Targets</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-4" style={{ borderColor: 'var(--card-border)' }}>
            <CheckCircle2 className="h-5 w-5 text-[#00843D]" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{metrics?.questionsPerDay} questions/day</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {metrics?.remaining?.toLocaleString()} remaining of {totalQuestions.toLocaleString()} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4" style={{ borderColor: 'var(--card-border)' }}>
            <CheckCircle2 className="h-5 w-5 text-[#002B5C]" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{metrics?.totalAnswered?.toLocaleString()} answered</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Across {attempts.length} practice session{attempts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Subject Progress</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Coverage and accuracy based on {attempts.length > 0 ? 'your practice attempts' : 'no data yet'}
        </p>
        <div className="mt-4 space-y-3">
          {CFA_SUBJECTS_ORDERED.map(subject => {
            const stat = subjectStats[subject];
            const weight = Math.round((CFA_CURRICULUM_WEIGHTS[subject] ?? 0) * 100);

            return (
              <div key={subject} className="flex items-center gap-3">
                <p className="w-48 truncate text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {subject}
                </p>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stat.coverage}%`,
                        background: stat.coverage > 70 ? '#00843D' : stat.coverage > 30 ? '#C5A258' : '#002B5C',
                      }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-xs font-medium" style={{
                  color: stat.total > 0
                    ? (stat.accuracy >= 70 ? '#00843D' : stat.accuracy >= 50 ? '#C5A258' : '#ef4444')
                    : 'var(--foreground-secondary)',
                }}>
                  {stat.total > 0 ? `${stat.accuracy}%` : '--'}
                </span>
                <span className="w-10 text-right text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                  ({weight}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus Areas */}
      {focusAreas.length > 0 && (
        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Focus Areas</h3>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Your 3 weakest subjects by accuracy - prioritize these for maximum score improvement.
          </p>
          <div className="mt-4 space-y-4">
            {focusAreas.map(area => (
              <div key={area.name} className="rounded-lg border p-4" style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{area.name}</p>
                  <span className="text-sm font-bold" style={{
                    color: area.accuracy >= 70 ? '#00843D' : area.accuracy >= 50 ? '#C5A258' : '#ef4444',
                  }}>
                    {area.accuracy}%
                  </span>
                </div>
                {area.weakModules.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {area.weakModules.map(mod => (
                      <div key={mod.name} className="flex items-center justify-between text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                        <span className="truncate pr-2">{mod.name}</span>
                        <span className="whitespace-nowrap font-medium" style={{
                          color: mod.percentage >= 70 ? '#00843D' : mod.percentage >= 50 ? '#C5A258' : '#ef4444',
                        }}>
                          {mod.score}/{mod.total} ({mod.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
