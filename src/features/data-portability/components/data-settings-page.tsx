'use client';

import { ExportSection } from './export-section';
import { ImportSection } from './import-section';

export function DataSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Data Management
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Export your progress to back up or transfer to another device, or import from a previous
          export to restore your data.
        </p>
      </div>

      <ExportSection />
      <ImportSection />
    </div>
  );
}
