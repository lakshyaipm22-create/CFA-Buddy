import type { ExportData } from '../types';

/**
 * Triggers a browser download of the export data as a JSON file.
 * Filename format: cfa-buddy-export-{YYYY-MM-DD}.json
 */
export function downloadExportData(data: ExportData): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `cfa-buddy-export-${dateStr}.json`;

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
