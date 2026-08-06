'use client';

import { useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { gatherExportData, getDataCounts } from '../utils/exporter';
import { downloadExportData } from '../utils/download';
import { SECTION_LABELS } from '../utils/storage-keys';

export function ExportSection() {
  const [exported, setExported] = useState(false);
  const [dataCounts] = useState<Record<string, number>>(() => getDataCounts());

  const handleExport = () => {
    const data = gatherExportData();
    if (!data) return;
    downloadExportData(data);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const nonEmptySections = Object.entries(dataCounts).filter(([, count]) => count > 0);

  return (
    <section
      className="rounded-xl border p-6"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        Export Data
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        Download all your progress, attempts, flashcards, notes, and settings as a JSON file. Use
        this to back up your data or transfer it to another device.
      </p>

      {nonEmptySections.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
            Data to export
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {nonEmptySections.map(([key, count]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm"
                style={{ background: 'var(--background)' }}
              >
                <span style={{ color: 'var(--foreground-secondary)' }}>
                  {SECTION_LABELS[key] || key}
                </span>
                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nonEmptySections.length === 0 && (
        <div
          className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm"
          style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)' }}
        >
          No data to export yet. Start using CFA Buddy to generate data.
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={nonEmptySections.length === 0}
        className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: '#002B5C' }}
      >
        {exported ? (
          <>
            <CheckCircle className="h-4 w-4" style={{ color: '#00843D' }} />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export All Data
          </>
        )}
      </button>
    </section>
  );
}
