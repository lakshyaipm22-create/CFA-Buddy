'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScanStatus {
  status: string;
  totalFiles: number;
  resolvedCount?: number;
  unknownCount?: number;
  metadataResolutionPercent?: number;
  byResourceType: Record<string, number>;
  byProvider: Record<string, number>;
  byLevel?: Record<string, number>;
  lastScanTimestamp: string | null;
  lastFullScanTimestamp?: string | null;
  message?: string;
}

interface ScanResult {
  status: string;
  report?: {
    totalFiles: number;
    newFiles: number;
    modifiedFiles: number;
    deletedFiles: number;
    unchangedFiles: number;
    duplicates: number;
    errors: Array<{ filePath: string; error: string }>;
    missingPairs: string[];
    durationMs: number;
    byResourceType: Record<string, number>;
    byProvider: Record<string, number>;
  };
  message?: string;
}

export function ScannerDashboard() {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scanner');
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch {
      setError('Failed to load scan status');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch('/api/scanner');
        if (cancelled) return;
        const data = await res.json();
        setStatus(data);
        setError(null);
      } catch {
        if (!cancelled) setError('Failed to load scan status');
      }
    }

    loadStatus();
    return () => { cancelled = true; };
  }, []);

  const triggerScan = async (full: boolean) => {
    setScanning(true);
    setLastResult(null);
    setError(null);
    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full }),
      });
      const data = await res.json();
      setLastResult(data);
      // Refresh status after scan
      await fetchStatus();
    } catch {
      setError('Scan failed. Check server logs.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => triggerScan(false)}
          disabled={scanning}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Incremental Scan'}
        </button>
        <button
          onClick={() => triggerScan(true)}
          disabled={scanning}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Full Rescan'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Status Overview */}
      {status && status.status !== 'no-index' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Total Files" value={status.totalFiles} />
          <StatCard label="Metadata Resolved" value={`${status.metadataResolutionPercent ?? 0}%`} />
          <StatCard label="Unknown Type" value={status.unknownCount ?? 0} />
          <StatCard
            label="Last Scan"
            value={status.lastScanTimestamp
              ? new Date(status.lastScanTimestamp).toLocaleDateString()
              : 'Never'}
          />
        </div>
      )}

      {status && status.status === 'no-index' && (
        <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">No content index found. Run a scan to discover your study materials.</p>
        </div>
      )}

      {/* By Resource Type */}
      {status && Object.keys(status.byResourceType).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-sm font-medium text-zinc-300">By Resource Type</h3>
          <div className="space-y-2">
            {Object.entries(status.byResourceType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{formatResourceType(type)}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* By Provider */}
      {status && Object.keys(status.byProvider).length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-sm font-medium text-zinc-300">By Provider</h3>
          <div className="space-y-2">
            {Object.entries(status.byProvider)
              .sort((a, b) => b[1] - a[1])
              .map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{provider}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Last Scan Result */}
      {lastResult && lastResult.report && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-6">
          <h3 className="mb-3 text-sm font-medium text-green-300">Scan Complete</h3>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div><span className="text-zinc-400">Duration:</span> <span className="text-white">{lastResult.report.durationMs}ms</span></div>
            <div><span className="text-zinc-400">Total:</span> <span className="text-white">{lastResult.report.totalFiles}</span></div>
            <div><span className="text-zinc-400">New:</span> <span className="text-white">{lastResult.report.newFiles}</span></div>
            <div><span className="text-zinc-400">Modified:</span> <span className="text-white">{lastResult.report.modifiedFiles}</span></div>
            <div><span className="text-zinc-400">Deleted:</span> <span className="text-white">{lastResult.report.deletedFiles}</span></div>
            <div><span className="text-zinc-400">Unchanged:</span> <span className="text-white">{lastResult.report.unchangedFiles}</span></div>
            <div><span className="text-zinc-400">Duplicates:</span> <span className="text-white">{lastResult.report.duplicates}</span></div>
            <div><span className="text-zinc-400">Errors:</span> <span className="text-white">{lastResult.report.errors.length}</span></div>
          </div>
          {lastResult.report.missingPairs.length > 0 && (
            <div className="mt-3 border-t border-green-900/30 pt-3">
              <p className="text-xs text-zinc-400">{lastResult.report.missingPairs.length} missing answer pairs</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function formatResourceType(type: string): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
