'use client';

import { useState } from 'react';
import { getLocalProfile, saveLocalProfile } from '@/shared/lib/local-profile';
import type { LocalProfile } from '@/shared/lib/local-profile';

export function LocalProfileForm() {
  const [profile, setProfile] = useState<LocalProfile>(() => getLocalProfile());
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    saveLocalProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleChange(field: keyof LocalProfile, value: string | number) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {saved && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(0, 132, 61, 0.3)',
            background: 'rgba(0, 132, 61, 0.05)',
            color: '#00843D',
          }}
        >
          Profile saved successfully!
        </div>
      )}

      {/* Display Name */}
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={profile.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A258]/50"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--foreground)',
          }}
          placeholder="Your display name"
        />
      </div>

      {/* CFA Level */}
      <div>
        <label
          htmlFor="level"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          CFA Level
        </label>
        <select
          id="level"
          value={profile.level}
          onChange={(e) => handleChange('level', e.target.value)}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A258]/50"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="I">Level I</option>
          <option value="II">Level II</option>
          <option value="III">Level III</option>
        </select>
      </div>

      {/* Exam Date */}
      <div>
        <label
          htmlFor="examDate"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          Exam Date
        </label>
        <input
          id="examDate"
          type="date"
          value={profile.examDate}
          onChange={(e) => handleChange('examDate', e.target.value)}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A258]/50"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--foreground)',
          }}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Used for exam countdown and study planning
        </p>
      </div>

      {/* Study Hours Per Day */}
      <div>
        <label
          htmlFor="studyHoursPerDay"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          Study Hours Per Day
        </label>
        <input
          id="studyHoursPerDay"
          type="number"
          min={0.5}
          max={12}
          step={0.5}
          value={profile.studyHoursPerDay}
          onChange={(e) => handleChange('studyHoursPerDay', Number(e.target.value))}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A258]/50"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--foreground)',
          }}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Target daily study hours for your plan
        </p>
      </div>

      {/* Target Score */}
      <div>
        <label
          htmlFor="targetScore"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          Target Score (%)
        </label>
        <input
          id="targetScore"
          type="number"
          min={50}
          max={100}
          step={1}
          value={profile.targetScore}
          onChange={(e) => handleChange('targetScore', Number(e.target.value))}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A258]/50"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--foreground)',
          }}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Your target score percentage for the exam
        </p>
      </div>

      <button
        type="submit"
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
        style={{ background: '#C5A258' }}
      >
        Save Profile
      </button>
    </form>
  );
}
