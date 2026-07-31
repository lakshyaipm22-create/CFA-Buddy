'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Timer, Play, Pause, Square, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'cfa-buddy-study-timer';

interface TimerSession {
  date: string;
  seconds: number;
  page: string;
}

function getTimerSessions(): TimerSession[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

function saveTimerSession(session: TimerSession): void {
  const sessions = getTimerSessions();
  sessions.push(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getTodayTotal(): number {
  const today = new Date().toISOString().slice(0, 10);
  return getTimerSessions()
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.seconds, 0);
}

function getWeekTotal(): number {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  return getTimerSessions()
    .filter(s => s.date >= weekAgo)
    .reduce((sum, s) => sum + s.seconds, 0);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatHoursMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function detectPage(pathname: string): string {
  if (pathname.startsWith('/learn')) return 'Learn';
  if (pathname.startsWith('/questions')) return 'Questions';
  if (pathname.startsWith('/resources')) return 'Resources';
  if (pathname.startsWith('/flashcards')) return 'Flashcards';
  if (pathname.startsWith('/formulas')) return 'Formulas';
  return 'Study';
}

export function StudyTimer() {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [collapsed, setCollapsed] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPageRef = useRef<string>('Study');

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const handleStart = useCallback(() => {
    startPageRef.current = detectPage(pathname);
    setRunning(true);
  }, [pathname]);

  const handlePause = useCallback(() => { setRunning(false); }, []);

  const handleStop = useCallback(() => {
    if (elapsed > 0) {
      saveTimerSession({
        date: new Date().toISOString().slice(0, 10),
        seconds: elapsed,
        page: startPageRef.current,
      });
    }
    setRunning(false);
    setElapsed(0);
  }, [elapsed]);

  const todayTotal = getTodayTotal() + (running ? elapsed : 0);
  const weekTotal = getWeekTotal() + (running ? elapsed : 0);

  return (
    <div
      className="fixed bottom-4 right-4 z-40 rounded-xl border shadow-lg transition-all"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* Collapsed View */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-3 py-2 w-full"
      >
        <Timer className="h-4 w-4" style={{ color: running ? '#00843D' : 'var(--foreground-secondary)' }} />
        {running && (
          <span className="text-sm font-mono font-medium" style={{ color: 'var(--foreground)' }}>
            {formatTime(elapsed)}
          </span>
        )}
        {!running && !collapsed && (
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Study Timer</span>
        )}
        {collapsed
          ? <ChevronUp className="h-3 w-3" style={{ color: 'var(--foreground-secondary)' }} />
          : <ChevronDown className="h-3 w-3" style={{ color: 'var(--foreground-secondary)' }} />
        }
      </button>

      {/* Expanded View */}
      {!collapsed && (
        <div className="border-t px-4 py-3 space-y-3 min-w-[180px]" style={{ borderColor: 'var(--card-border)' }}>
          {/* Timer Display */}
          <div className="text-center">
            <p className="text-2xl font-mono font-bold" style={{ color: 'var(--foreground)' }}>
              {formatTime(elapsed)}
            </p>
            {running && (
              <p className="text-[10px]" style={{ color: 'var(--accent-secondary)' }}>
                {detectPage(pathname)}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            {!running ? (
              <button onClick={handleStart} className="rounded-lg p-2 text-white bg-[#00843D] hover:opacity-90" title="Start">
                <Play className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handlePause} className="rounded-lg p-2 text-white bg-[#C5A258] hover:opacity-90" title="Pause">
                <Pause className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={elapsed === 0}
              className="rounded-lg p-2 disabled:opacity-30 hover:opacity-90"
              style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground)' }}
              title="Stop & Save"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{formatHoursMinutes(todayTotal)}</p>
              <p className="text-[9px]" style={{ color: 'var(--foreground-secondary)' }}>Today</p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{formatHoursMinutes(weekTotal)}</p>
              <p className="text-[9px]" style={{ color: 'var(--foreground-secondary)' }}>This Week</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
