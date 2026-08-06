'use client';

import { useState, useCallback, useRef, useEffect, useTransition } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { uploadResource, checkUploadAvailability } from '../actions/upload';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { id: string; path: string; fileName: string }) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDialog({ open, onClose, onSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [uploadAvailable, setUploadAvailable] = useState<boolean | null>(null);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if upload is available
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const result = await checkUploadAvailability();
      if (result.success) {
        setUploadAvailable(result.data.available);
        if (!result.data.available) {
          setUnavailableReason(result.data.reason ?? 'Upload not available.');
        }
      }
    });
  }, [open]);

  const validateFile = useCallback((f: File): string | null => {
    if (f.type !== 'application/pdf') {
      return 'Only PDF files are allowed.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File size exceeds 100MB limit. Selected file: ${formatFileSize(f.size)}`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      handleFileSelect(dropped);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleFileSelect(selected);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !uploadAvailable) return;

    setUploading(true);
    setProgress(0);
    setError('');

    // Simulate progress since we cannot track actual upload progress with Server Actions
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadResource(formData);

    clearInterval(interval);

    if (result.success) {
      setProgress(100);
      setTimeout(() => {
        setUploading(false);
        setFile(null);
        setProgress(0);
        onSuccess?.(result.data);
        onClose();
      }, 500);
    } else {
      setUploading(false);
      setProgress(0);
      setError(result.error);
    }
  }, [file, uploadAvailable, onClose, onSuccess]);

  const handleClose = () => {
    if (uploading) return;
    setFile(null);
    setError('');
    setProgress(0);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div
        className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Upload Resource</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="rounded p-1 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Upload Unavailable Warning */}
        {uploadAvailable === false && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-700/30 bg-yellow-900/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
            <p className="text-xs text-yellow-400">{unavailableReason}</p>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => uploadAvailable !== false && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive ? 'border-[#C5A258] bg-[#C5A258]/5' : ''
          } ${uploadAvailable === false ? 'cursor-not-allowed opacity-50' : ''}`}
          style={{ borderColor: dragActive ? '#C5A258' : 'var(--card-border)' }}
        >
          {file ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-[#C5A258]" />
              <div>
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8" style={{ color: 'var(--foreground-secondary)' }} />
              <p className="text-sm font-medium text-white">
                Drop a PDF here or click to browse
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                PDF only, max 100MB
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: '#C5A258' }}
              />
            </div>
            <p className="mt-1 text-xs text-center" style={{ color: 'var(--foreground-secondary)' }}>
              Uploading... {progress}%
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
            style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading || uploadAvailable === false || isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: uploadAvailable === false ? '#555' : '#C5A258' }}
            title={uploadAvailable === false ? 'Upload not available - Supabase not configured' : undefined}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
