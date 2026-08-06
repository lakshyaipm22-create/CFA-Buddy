'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { validateImportData, generateImportPreview, importData } from '../utils/importer';
import { SECTION_LABELS } from '../utils/storage-keys';
import type { ImportPreview, ImportResult, ValidationError } from '../types';
import type { ValidatedExportData } from '../utils/importer';

type ImportState =
  | { step: 'idle' }
  | { step: 'preview'; preview: ImportPreview; validData: ValidatedExportData }
  | { step: 'success'; result: ImportResult }
  | { step: 'error'; errors: ValidationError[] };

export function ImportSection() {
  const [state, setState] = useState<ImportState>({ step: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setState({
        step: 'error',
        errors: [{ field: 'file', message: 'Please select a JSON file (.json extension required).' }],
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        setState({
          step: 'error',
          errors: [{ field: 'file', message: 'Could not read file content.' }],
        });
        return;
      }

      const validation = validateImportData(content);
      if (!validation.success) {
        setState({ step: 'error', errors: validation.errors });
        return;
      }

      const preview = generateImportPreview(validation.data);
      setState({ step: 'preview', preview, validData: validation.data });
    };
    reader.onerror = () => {
      setState({
        step: 'error',
        errors: [{ field: 'file', message: 'Failed to read the selected file.' }],
      });
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (state.step !== 'preview') return;
    const result = importData(state.validData);
    setState({ step: 'success', result });
  };

  const handleReset = () => {
    setState({ step: 'idle' });
  };

  return (
    <section
      className="rounded-xl border p-6"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        Import Data
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        Restore your data from a previously exported JSON file. This will overwrite existing data for
        each imported section.
      </p>

      {state.step === 'idle' && (
        <div
          className="mt-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
          style={{
            borderColor: dragOver ? '#C5A258' : 'var(--card-border)',
            background: dragOver ? 'rgba(197, 162, 88, 0.05)' : undefined,
          }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-8 w-8" style={{ color: 'var(--foreground-secondary)' }} />
          <p className="mt-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Drop your export file here, or click to browse
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Accepts .json files exported from CFA Buddy
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {state.step === 'error' && (
        <div className="mt-4">
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <div>
                <p className="font-medium" style={{ color: '#ef4444' }}>
                  Import Failed
                </p>
                <ul className="mt-1 space-y-1">
                  {state.errors.map((err, i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 text-sm font-medium underline"
            style={{ color: '#C5A258' }}
          >
            Try another file
          </button>
        </div>
      )}

      {state.step === 'preview' && (
        <div className="mt-4">
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: '#C5A258', background: 'rgba(197, 162, 88, 0.05)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Import Preview
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Exported on {new Date(state.preview.exportDate).toLocaleDateString()} (v
              {state.preview.appVersion}, data version {state.preview.dataVersion})
            </p>

            <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {Object.entries(state.preview.itemCounts)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => (
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

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
              style={{ background: '#00843D' }}
            >
              <CheckCircle className="h-4 w-4" />
              Confirm Import
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state.step === 'success' && (
        <div className="mt-4">
          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: state.result.success ? '#00843D' : '#ef4444',
              background: state.result.success
                ? 'rgba(0, 132, 61, 0.05)'
                : 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <div className="flex items-start gap-3">
              {state.result.success ? (
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#00843D' }} />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
              )}
              <div>
                <p
                  className="font-medium"
                  style={{ color: state.result.success ? '#00843D' : '#ef4444' }}
                >
                  {state.result.success
                    ? `Successfully imported ${state.result.itemsImported} data sections`
                    : 'Import completed with errors'}
                </p>
                {state.result.errors.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {state.result.errors.map((err, i) => (
                      <li key={i} className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                        {err.field}: {err.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {state.result.warnings.length > 0 && (
            <div
              className="mt-3 rounded-lg border p-3"
              style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <ul className="space-y-1">
                  {state.result.warnings.map((warning, i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="mt-3 text-sm font-medium underline"
            style={{ color: '#C5A258' }}
          >
            Import another file
          </button>
        </div>
      )}
    </section>
  );
}
