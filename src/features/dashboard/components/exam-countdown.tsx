'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';

function getExamDateSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cfa-buddy-exam-date');
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
  const [saveCount, setSaveCount] = useState(0);

  const saveDate = () => {
    if (!inputDate) return;
    localStorage.setItem('cfa-buddy-exam-date', inputDate);
    // Trigger re-render to pick up new value
    setSaveCount(n => n + 1);
  };

  const savedDate = targetDate ?? (typeof window !== 'undefined' ? localStorage.getItem('cfa-buddy-exam-date') : null);

  // Use useMemo to compute days left based on the saved date
  // The saveCount dep forces re-computation after saving
  const daysLeft = useMemo(() => {
    if (!savedDate) return null;
    return Math.ceil((new Date(savedDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDate, saveCount]);

  if (!savedDate) {
    return (
      <div className="rounded-lg border border-dashed border-[#1a2332] bg-[#0d1117] p-6">
        <h3 className="text-sm font-medium text-zinc-300">Exam Countdown</h3>
        <p className="mt-1 text-xs text-zinc-500">Set your exam date to see countdown and pacing.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="rounded-lg border border-[#1a2332] bg-[#111827] px-3 py-2 text-sm text-white"
          />
          <button
            onClick={saveDate}
            disabled={!inputDate}
            className="rounded-lg bg-[#002B5C] px-4 py-2 text-sm font-medium text-[#C5A258] hover:bg-[#003d7a] disabled:opacity-50"
          >
            Set Date
          </button>
        </div>
      </div>
    );
  }

  const isUrgent = daysLeft !== null && daysLeft <= 30;

  return (
    <div className={`rounded-lg border p-6 ${isUrgent ? 'border-red-900/50 bg-red-950/10' : 'border-[#1a2332] bg-[#0d1117]'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-300">Exam Countdown</h3>
          <p className="mt-1 text-xs text-zinc-500">{new Date(savedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${isUrgent ? 'text-red-400' : 'text-[#C5A258]'}`}>
            {daysLeft}
          </p>
          <p className="text-xs text-zinc-500">days remaining</p>
        </div>
      </div>
    </div>
  );
}
