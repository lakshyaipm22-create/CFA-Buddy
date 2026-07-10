'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';

// Module-level cache for referential stability
let examDateCached: string | null = null;
let examDateLastCheck: string | null = '___init___';

function getExamDateSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem('cfa-buddy-exam-date');
  if (value !== examDateLastCheck) {
    examDateLastCheck = value;
    examDateCached = value;
  }
  return examDateCached;
}

function getExamDateServerSnapshot(): string | null {
  return null;
}

function subscribeExamDate(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function ExamCountdown() {
  const targetDate = useSyncExternalStore(subscribeExamDate, getExamDateSnapshot, getExamDateServerSnapshot);
  const [inputDate, setInputDate] = useState('');

  const saveDate = () => {
    if (!inputDate) return;
    localStorage.setItem('cfa-buddy-exam-date', inputDate);
    window.dispatchEvent(new StorageEvent('storage', { key: 'cfa-buddy-exam-date' }));
    setInputDate('');
  };

  const daysLeft = useMemo(() => {
    if (!targetDate) return null;
    return Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  }, [targetDate]);

  if (!targetDate) {
    return (
      <div
        className="rounded-lg border border-dashed p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Exam Countdown</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Set your exam date to see countdown and pacing.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--background-tertiary)', color: 'var(--foreground)' }}
          />
          <button
            onClick={saveDate}
            disabled={!inputDate}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            Set Date
          </button>
        </div>
      </div>
    );
  }

  const isUrgent = daysLeft !== null && daysLeft <= 30;

  return (
    <div
      className={`rounded-lg border p-6 ${isUrgent ? 'border-red-900/50 bg-red-950/10' : ''}`}
      style={isUrgent ? undefined : { borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Exam Countdown</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${isUrgent ? 'text-red-400' : ''}`} style={isUrgent ? undefined : { color: 'var(--accent-secondary)' }}>
            {daysLeft}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>days remaining</p>
        </div>
      </div>
    </div>
  );
}
