'use client';

import { useMemo } from 'react';
import { useLocalStorageSessions } from '../hooks/use-local-storage-sessions';

interface DayData {
  day: string;
  questions: number;
}

export function WeeklyProgress() {
  const sessions = useLocalStorageSessions();

  const weekData = useMemo<DayData[]>(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const data: DayData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];

      // Count questions answered on this day from sessions
      let questions = 0;
      for (const session of sessions) {
        for (const attempt of session.attempts ?? []) {
          if (attempt.timestamp && attempt.timestamp.startsWith(dayKey)) {
            questions++;
          }
        }
      }

      data.push({ day: days[date.getDay()], questions });
    }

    return data;
  }, [sessions]);

  const maxQuestions = Math.max(...weekData.map(d => d.questions), 1);

  return (
    <div
      className="rounded-lg border p-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h3 className="mb-4 text-sm font-medium" style={{ color: 'var(--foreground)' }}>Weekly Progress</h3>
      <div className="flex items-end gap-2">
        {weekData.map((day, idx) => (
          <div key={idx} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full" style={{ height: '80px' }}>
              <div
                className="absolute bottom-0 w-full rounded-t transition-all"
                style={{
                  height: `${Math.max((day.questions / maxQuestions) * 100, day.questions > 0 ? 10 : 0)}%`,
                  background: 'var(--accent-primary)',
                }}
              />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{day.day}</span>
            {day.questions > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{day.questions}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
