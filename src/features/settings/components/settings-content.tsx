'use client';

import { useState } from 'react';
import { Download, Upload, Trash2, Sun, Moon, HardDrive, ExternalLink } from 'lucide-react';

const LOCAL_STORAGE_KEYS = [
  'cfa-buddy-sessions',
  'cfa-buddy-exam-date',
  'cfa-buddy-theme',
  'cfa-buddy-flashcards',
  'cfa-buddy-flashcards-reviewed-today',
  'cfa-buddy-formula-bookmarks',
  'cfa-buddy-los-progress',
  'cfa-buddy-revision-schedule',
  'cfa-buddy-study-timer',
  'cfa-buddy-recent-searches',
];

function getStorageSize(): string {
  if (typeof window === 'undefined') return '0 KB';
  let total = 0;
  for (const key of LOCAL_STORAGE_KEYS) {
    const item = localStorage.getItem(key);
    if (item) total += item.length * 2; // UTF-16
  }
  return `${(total / 1024).toFixed(1)} KB`;
}

export function SettingsContent() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('cfa-buddy-theme') ?? 'dark';
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [storageSize] = useState(() => getStorageSize());

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('cfa-buddy-theme', next);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
  };

  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (const key of LOCAL_STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val) {
        try { data[key] = JSON.parse(val); }
        catch { data[key] = val; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cfa-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Record<string, unknown>;
        for (const [key, value] of Object.entries(data)) {
          if (LOCAL_STORAGE_KEYS.includes(key)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          }
        }
        window.location.reload();
      } catch {
        alert('Invalid backup file. Please select a valid CFA Buddy JSON export.');
      }
    };
    input.click();
  };

  const resetAllData = () => {
    for (const key of LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    setShowResetConfirm(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Theme */}
      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Theme</p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Toggle between dark and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Export Data</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Download all your study data as JSON</p>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Import Data</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Restore from a previously exported backup</p>
            </div>
            <button
              onClick={importData}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">Reset All Data</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Delete all study progress. This cannot be undone.</p>
            </div>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-red-900/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
                Reset
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={resetAllData} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
                  Confirm Delete
                </button>
                <button onClick={() => setShowResetConfirm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Storage */}
      <Section title="Storage">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5" style={{ color: 'var(--foreground-secondary)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{storageSize} used</p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>All data stored locally in your browser</p>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-2">
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            <span className="font-medium">CFA Buddy</span> v1.0.0
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            A personal CFA Level I exam preparation platform. 50 sample questions, flashcards with SM-2 spaced repetition, 30 formula cards, and comprehensive analytics.
          </p>
          <a
            href="https://github.com/lakshyaipm22-create/CFA-Buddy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs underline"
            style={{ color: 'var(--accent-secondary)' }}
          >
            <ExternalLink className="h-3 w-3" />
            View on GitHub
          </a>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{title}</h3>
      {children}
    </div>
  );
}
