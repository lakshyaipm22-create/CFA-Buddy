'use client';

import { useState, useMemo, useCallback } from 'react';
import { Brain, RotateCcw, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Zap } from 'lucide-react';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';
import { formulaSeed, type FormulaEntry } from '../data/formula-seed';
import {
  selectFormulaQuiz,
  saveFormulaQuizResult,
  getFormulaQuizHistory,
  type FormulaQuizConfig,
  type FormulaRating,
  type FormulaQuizResult,
} from '../utils/formula-quiz-engine';

type QuizPhase = 'config' | 'active' | 'summary';

interface QuizState {
  formulas: FormulaEntry[];
  currentIndex: number;
  revealed: boolean;
  results: FormulaQuizResult[];
}

export function FormulaQuiz() {
  const [phase, setPhase] = useState<QuizPhase>('config');
  const [config, setConfig] = useState<FormulaQuizConfig>({
    subjects: [],
    difficulty: [],
    examFrequency: [],
    count: 10,
  });
  const [quizState, setQuizState] = useState<QuizState>({
    formulas: [],
    currentIndex: 0,
    revealed: false,
    results: [],
  });

  const totalAttempted = useState<number>(() => {
    return getFormulaQuizHistory().length;
  })[0];

  const handleStartQuiz = useCallback(() => {
    const selected = selectFormulaQuiz(config);
    if (selected.length === 0) return;
    setQuizState({
      formulas: selected,
      currentIndex: 0,
      revealed: false,
      results: [],
    });
    setPhase('active');
  }, [config]);

  const handleRate = useCallback((rating: FormulaRating) => {
    const current = quizState.formulas[quizState.currentIndex];
    if (!current) return;

    saveFormulaQuizResult(current.id, rating);

    const newResult: FormulaQuizResult = {
      formulaId: current.id,
      rating,
      timestamp: new Date().toISOString(),
    };

    const updatedResults = [...quizState.results, newResult];
    const nextIndex = quizState.currentIndex + 1;

    if (nextIndex >= quizState.formulas.length) {
      setQuizState(prev => ({ ...prev, results: updatedResults }));
      setPhase('summary');
    } else {
      setQuizState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        revealed: false,
        results: updatedResults,
      }));
    }
  }, [quizState]);

  const handleReveal = useCallback(() => {
    setQuizState(prev => ({ ...prev, revealed: true }));
  }, []);

  const handleRestart = useCallback(() => {
    setPhase('config');
    setQuizState({ formulas: [], currentIndex: 0, revealed: false, results: [] });
  }, []);

  if (phase === 'config') {
    return (
      <QuizConfigScreen
        config={config}
        setConfig={setConfig}
        onStart={handleStartQuiz}
        totalAttempted={totalAttempted}
      />
    );
  }

  if (phase === 'active') {
    const currentFormula = quizState.formulas[quizState.currentIndex];
    return (
      <QuizActiveScreen
        formula={currentFormula}
        currentIndex={quizState.currentIndex}
        total={quizState.formulas.length}
        revealed={quizState.revealed}
        onReveal={handleReveal}
        onRate={handleRate}
      />
    );
  }

  return (
    <QuizSummaryScreen
      results={quizState.results}
      formulas={quizState.formulas}
      onRestart={handleRestart}
    />
  );
}

/* ─── Config Screen ─── */

function QuizConfigScreen({
  config,
  setConfig,
  onStart,
  totalAttempted,
}: {
  config: FormulaQuizConfig;
  setConfig: React.Dispatch<React.SetStateAction<FormulaQuizConfig>>;
  onStart: () => void;
  totalAttempted: number;
}) {
  const availableCount = useMemo(() => {
    return formulaSeed.filter(f => {
      if (config.subjects && config.subjects.length > 0 && !config.subjects.includes(f.subject)) return false;
      if (config.difficulty && config.difficulty.length > 0 && !config.difficulty.includes(f.difficulty)) return false;
      if (config.examFrequency && config.examFrequency.length > 0 && !config.examFrequency.includes(f.examFrequency)) return false;
      return true;
    }).length;
  }, [config]);

  const toggleSubject = (subject: string) => {
    setConfig(prev => {
      const current = prev.subjects ?? [];
      const updated = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      return { ...prev, subjects: updated };
    });
  };

  const toggleDifficulty = (d: 'core' | 'advanced') => {
    setConfig(prev => {
      const current = prev.difficulty ?? [];
      const updated = current.includes(d)
        ? current.filter(x => x !== d)
        : [...current, d];
      return { ...prev, difficulty: updated };
    });
  };

  const toggleFrequency = (f: 'high' | 'medium' | 'low') => {
    setConfig(prev => {
      const current = prev.examFrequency ?? [];
      const updated = current.includes(f)
        ? current.filter(x => x !== f)
        : [...current, f];
      return { ...prev, examFrequency: updated };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
          background: 'rgba(197, 162, 88, 0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Brain style={{ height: '1.25rem', width: '1.25rem', color: 'var(--accent-secondary)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Formula Recall Quiz
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--foreground-secondary)' }}>
            Test your recall of CFA formulas. Weak formulas appear more often.
            {totalAttempted > 0 && ` (${totalAttempted} total reviews)`}
          </p>
        </div>
      </div>

      {/* Subject Filter */}
      <div>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Subjects (leave empty for all)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
          {CFA_SUBJECTS_ORDERED.map(s => (
            <FilterChip
              key={s}
              label={s}
              active={(config.subjects ?? []).includes(s)}
              onClick={() => toggleSubject(s)}
            />
          ))}
        </div>
      </div>

      {/* Difficulty Filter */}
      <div>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Difficulty
        </label>
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
          <FilterChip label="Core" active={(config.difficulty ?? []).includes('core')} onClick={() => toggleDifficulty('core')} />
          <FilterChip label="Advanced" active={(config.difficulty ?? []).includes('advanced')} onClick={() => toggleDifficulty('advanced')} />
        </div>
      </div>

      {/* Exam Frequency Filter */}
      <div>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Exam Frequency
        </label>
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
          <FilterChip label="High" active={(config.examFrequency ?? []).includes('high')} onClick={() => toggleFrequency('high')} />
          <FilterChip label="Medium" active={(config.examFrequency ?? []).includes('medium')} onClick={() => toggleFrequency('medium')} />
          <FilterChip label="Low" active={(config.examFrequency ?? []).includes('low')} onClick={() => toggleFrequency('low')} />
        </div>
      </div>

      {/* Count Selector */}
      <div>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Number of formulas
        </label>
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
          {[10, 20, availableCount].map(n => (
            <FilterChip
              key={n}
              label={n === availableCount ? `All (${availableCount})` : String(n)}
              active={config.count === n}
              onClick={() => setConfig(prev => ({ ...prev, count: n }))}
            />
          ))}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={availableCount === 0}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none',
          fontSize: '0.875rem', fontWeight: 600, cursor: availableCount > 0 ? 'pointer' : 'not-allowed',
          background: availableCount > 0 ? 'var(--accent-secondary)' : 'var(--card-border)',
          color: availableCount > 0 ? '#0a0e14' : 'var(--foreground-secondary)',
          transition: 'opacity 150ms',
        }}
      >
        <Brain style={{ height: '1rem', width: '1rem' }} />
        Start Quiz ({Math.min(config.count, availableCount)} formulas)
        <ChevronRight style={{ height: '1rem', width: '1rem' }} />
      </button>
    </div>
  );
}

/* ─── Active Quiz Screen ─── */

function QuizActiveScreen({
  formula,
  currentIndex,
  total,
  revealed,
  onReveal,
  onRate,
}: {
  formula: FormulaEntry;
  currentIndex: number;
  total: number;
  revealed: boolean;
  onReveal: () => void;
  onRate: (rating: FormulaRating) => void;
}) {
  const progress = ((currentIndex) / total) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: '0.375rem', borderRadius: '9999px', background: 'var(--nav-hover-bg)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '9999px', background: 'var(--accent-secondary)', width: `${progress}%`, transition: 'width 300ms' }} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-secondary)', whiteSpace: 'nowrap' }}>
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Quiz Card */}
      <div style={{
        border: '1px solid var(--card-border)', borderRadius: '0.75rem',
        background: 'var(--card-bg)', padding: '1.5rem', minHeight: '16rem',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Prompt: Formula name + context */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--foreground-secondary)',
              background: 'var(--nav-hover-bg)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
            }}>
              {formula.subject}
            </span>
            <span style={{
              fontSize: '0.625rem', color: 'var(--foreground-secondary)',
            }}>
              {formula.reading}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {formula.name}
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--foreground-secondary)' }}>
            Can you recall the formula, its variables, and how to apply it?
          </p>
        </div>

        {/* Reveal button or revealed content */}
        {!revealed ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={onReveal}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                border: '1px solid var(--accent-secondary)',
                background: 'rgba(197, 162, 88, 0.08)',
                color: 'var(--accent-secondary)',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Zap style={{ height: '1rem', width: '1rem' }} />
              Show Formula
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Formula */}
            <div style={{
              padding: '0.75rem', borderRadius: '0.5rem',
              background: 'rgba(197, 162, 88, 0.06)', border: '1px solid rgba(197, 162, 88, 0.15)',
            }}>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                {formula.formula}
              </p>
            </div>

            {/* Variables */}
            <div>
              <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-secondary)' }}>
                Variables
              </p>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--foreground)' }}>
                {formula.variables}
              </p>
            </div>

            {/* Example */}
            <div>
              <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-secondary)' }}>
                Example
              </p>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--foreground)' }}>
                {formula.example}
              </p>
            </div>

            {/* Key Tip */}
            {formula.keyTip && (
              <div style={{
                padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                background: 'rgba(0, 132, 61, 0.06)', border: '1px solid rgba(0, 132, 61, 0.15)',
              }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--accent-success)' }}>
                  Tip: {formula.keyTip}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating Buttons (only when revealed) */}
      {revealed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <RatingButton rating="forgot" label="Forgot" color="#ef4444" icon={<XCircle style={{ height: '1rem', width: '1rem' }} />} onRate={onRate} />
          <RatingButton rating="struggled" label="Struggled" color="#f97316" icon={<AlertTriangle style={{ height: '1rem', width: '1rem' }} />} onRate={onRate} />
          <RatingButton rating="gotIt" label="Got It" color="#00843D" icon={<CheckCircle2 style={{ height: '1rem', width: '1rem' }} />} onRate={onRate} />
          <RatingButton rating="easy" label="Easy" color="#002B5C" icon={<Zap style={{ height: '1rem', width: '1rem' }} />} onRate={onRate} />
        </div>
      )}
    </div>
  );
}

function RatingButton({
  rating,
  label,
  color,
  icon,
  onRate,
}: {
  rating: FormulaRating;
  label: string;
  color: string;
  icon: React.ReactNode;
  onRate: (r: FormulaRating) => void;
}) {
  return (
    <button
      onClick={() => onRate(rating)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
        padding: '0.75rem 0.5rem', borderRadius: '0.5rem',
        border: `1px solid ${color}33`,
        background: `${color}0d`,
        color,
        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
        transition: 'background 150ms, transform 150ms',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Summary Screen ─── */

function QuizSummaryScreen({
  results,
  formulas,
  onRestart,
}: {
  results: FormulaQuizResult[];
  formulas: FormulaEntry[];
  onRestart: () => void;
}) {
  const ratingCounts = useMemo(() => {
    const counts: Record<FormulaRating, number> = { forgot: 0, struggled: 0, gotIt: 0, easy: 0 };
    for (const r of results) {
      counts[r.rating]++;
    }
    return counts;
  }, [results]);

  const weakFormulas = useMemo(() => {
    const weakIds = results
      .filter(r => r.rating === 'forgot' || r.rating === 'struggled')
      .map(r => r.formulaId);
    return formulas.filter(f => weakIds.includes(f.id));
  }, [results, formulas]);

  const totalCorrectRate = results.length > 0
    ? Math.round(((ratingCounts.gotIt + ratingCounts.easy) / results.length) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Quiz Complete
        </h3>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-secondary)' }}>
          {results.length} formulas reviewed
        </p>
      </div>

      {/* Score Circle */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '50%',
          border: `3px solid ${totalCorrectRate >= 70 ? 'var(--accent-success)' : totalCorrectRate >= 40 ? 'var(--accent-secondary)' : '#ef4444'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {totalCorrectRate}%
          </span>
          <span style={{ fontSize: '0.625rem', color: 'var(--foreground-secondary)' }}>recall</span>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        <StatCard label="Forgot" count={ratingCounts.forgot} color="#ef4444" />
        <StatCard label="Struggled" count={ratingCounts.struggled} color="#f97316" />
        <StatCard label="Got It" count={ratingCounts.gotIt} color="#00843D" />
        <StatCard label="Easy" count={ratingCounts.easy} color="#002B5C" />
      </div>

      {/* Weak Formulas List */}
      {weakFormulas.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Focus Areas ({weakFormulas.length} formulas need review)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {weakFormulas.map(f => (
              <div
                key={f.id}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                  border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground)' }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-secondary)', marginLeft: '0.5rem' }}>
                    {f.subject}
                  </span>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                  {f.formula.length > 30 ? f.formula.slice(0, 30) + '...' : f.formula}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restart Button */}
      <button
        onClick={onRestart}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none',
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          background: 'var(--accent-secondary)', color: '#0a0e14',
        }}
      >
        <RotateCcw style={{ height: '1rem', width: '1rem' }} />
        Start New Quiz
      </button>
    </div>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem',
      border: `1px solid ${color}22`, background: `${color}08`,
    }}>
      <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color }}>{count}</p>
      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--foreground-secondary)' }}>{label}</p>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
        border: active ? '1px solid var(--accent-secondary)' : '1px solid var(--card-border)',
        background: active ? 'rgba(197, 162, 88, 0.1)' : 'var(--card-bg)',
        color: active ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
        fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {label}
    </button>
  );
}
