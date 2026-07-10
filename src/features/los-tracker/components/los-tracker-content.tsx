'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';
import { sortByCfaOrder } from '@/shared/config/subjects';

type LOSStatus = 'not-started' | 'reading' | 'practiced' | 'revised' | 'mastered';

const STATUS_COLORS: Record<LOSStatus, string> = {
  'not-started': 'var(--nav-hover-bg)',
  'reading': '#002B5C',
  'practiced': '#C5A258',
  'revised': '#00843D',
  'mastered': '#10b981',
};

const STATUS_LABELS: Record<LOSStatus, string> = {
  'not-started': 'Not Started',
  'reading': 'Reading',
  'practiced': 'Practiced',
  'revised': 'Revised',
  'mastered': 'Mastered',
};

// Derive LOS items from sample questions (subjects + topics)
const LOS_ITEMS = (() => {
  const items: Array<{ id: string; subject: string; topic: string }> = [];
  const seen = new Set<string>();
  for (const q of sampleQuestions) {
    const key = `${q.subject}:${q.topic ?? 'General'}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ id: key, subject: q.subject, topic: q.topic ?? 'General' });
    }
  }
  return items.sort((a, b) => a.subject.localeCompare(b.subject) || a.topic.localeCompare(b.topic));
})();

const SUBJECTS = sortByCfaOrder([...new Set(LOS_ITEMS.map(i => i.subject))]);

function getLOSProgress(): Record<string, LOSStatus> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('cfa-buddy-los-progress') ?? '{}'); } catch { return {}; }
}

function saveLOSProgress(progress: Record<string, LOSStatus>): void {
  localStorage.setItem('cfa-buddy-los-progress', JSON.stringify(progress));
}

export function LOSTrackerContent() {
  const [progress, setProgress] = useState<Record<string, LOSStatus>>(() => getLOSProgress());
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const filteredItems = selectedSubject ? LOS_ITEMS.filter(i => i.subject === selectedSubject) : LOS_ITEMS;

  const stats = useMemo(() => {
    const total = LOS_ITEMS.length;
    const covered = Object.values(progress).filter(s => s !== 'not-started').length;
    const mastered = Object.values(progress).filter(s => s === 'mastered').length;
    return { total, covered, mastered, pct: total > 0 ? Math.round((covered / total) * 100) : 0 };
  }, [progress]);

  const cycleStatus = (id: string) => {
    const order: LOSStatus[] = ['not-started', 'reading', 'practiced', 'revised', 'mastered'];
    const current = progress[id] ?? 'not-started';
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const updated = { ...progress, [id]: order[nextIdx] };
    setProgress(updated);
    saveLOSProgress(updated);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>{stats.pct}%</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>LOS Covered</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{stats.covered}/{stats.total}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Topics Started</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-[#00843D]">{stats.mastered}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Mastered</p>
        </div>
      </div>

      {/* Color-coded Grid (GitHub-style) */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Progress Grid</h3>
          <div className="flex items-center gap-2">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ background: color }} />
                <span className="text-[9px]" style={{ color: 'var(--foreground-secondary)' }}>{STATUS_LABELS[status as LOSStatus]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {LOS_ITEMS.map(item => {
            const status = progress[item.id] ?? 'not-started';
            return (
              <button
                key={item.id}
                onClick={() => cycleStatus(item.id)}
                className="h-5 w-5 rounded-sm transition-all hover:ring-1 hover:ring-[var(--accent-secondary)]"
                style={{ background: STATUS_COLORS[status] }}
                title={`${item.subject}: ${item.topic} (${STATUS_LABELS[status]})`}
              />
            );
          })}
        </div>
      </div>

      {/* Subject Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSubject(null)}
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={!selectedSubject ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' } : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
        >
          All
        </button>
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s === selectedSubject ? null : s)}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={s === selectedSubject ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' } : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
          >
            {s.split(' ').slice(0, 2).join(' ')}
          </button>
        ))}
      </div>

      {/* Topic List */}
      <div className="space-y-2">
        {filteredItems.map(item => {
          const status = progress[item.id] ?? 'not-started';
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <button
                onClick={() => cycleStatus(item.id)}
                className="h-4 w-4 shrink-0 rounded-sm"
                style={{ background: STATUS_COLORS[status] }}
                title={`Click to advance: ${STATUS_LABELS[status]}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{item.topic}</p>
                <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{item.subject}</p>
              </div>
              <span className="text-[10px] shrink-0 rounded px-2 py-0.5" style={{ background: STATUS_COLORS[status], color: '#fff' }}>
                {STATUS_LABELS[status]}
              </span>
              <Link
                href="/learn"
                className="text-[10px] shrink-0 underline"
                style={{ color: 'var(--accent-secondary)' }}
              >
                Study
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
