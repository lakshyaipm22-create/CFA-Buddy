/**
 * Content Scanner — Type Definitions
 * 
 * The scanner produces provider-agnostic metadata for every discovered file.
 * Every provider parser outputs the same unified ContentMetadata shape.
 */

export type ResourceType =
  | 'curriculum'
  | 'schweser-notes'
  | 'ift-notes'
  | 'mark-meldrum-notes'
  | 'fintree-notes'
  | 'question-bank'
  | 'mock-exam'
  | 'formula-sheet'
  | 'video'
  | 'personal-note'
  | 'solution'
  | 'answer-key'
  | 'unknown';

export type ResourceStatus = 'active' | 'inactive' | 'deleted';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface ContentMetadata {
  /** Unique identifier (SHA256 of relative path for stability) */
  id: string;
  /** Provider slug (curriculum, schweser, ift, mark-meldrum, fintree, uworld, 25th-hour, personal) */
  provider: string | null;
  /** CFA Level (1, 2, 3) */
  level: number | null;
  /** Full subject name (e.g., "Financial Statement Analysis") */
  subject: string | null;
  /** Reading title or number */
  reading: string | null;
  /** Reading number (numeric, for sorting) */
  readingNumber: number | null;
  /** Topic / LOS if identifiable */
  topic: string | null;
  /** Year of the material (2024, 2025, 2026) */
  year: number | null;
  /** Version identifier (e.g., "V1", "2025 Edition") */
  version: string | null;
  /** Whether this is the latest version in its group */
  isLatest: boolean;
  /** Absolute path to file */
  filePath: string;
  /** Relative path from content/ root */
  relativePath: string;
  /** Filename without path */
  fileName: string;
  /** File extension (lowercase, without dot) */
  extension: string;
  /** File size in bytes */
  fileSize: number;
  /** File modification time (ISO string) */
  modifiedTime: string;
  /** SHA256 checksum of file content */
  checksum: string;
  /** Classified resource type */
  resourceType: ResourceType;
  /** Status: active, inactive (older version), deleted (no longer on disk) */
  status: ResourceStatus;
  /** Paired file (e.g., answer key for a question bank) */
  pairedWith: string | null;
  /** When this file was first discovered */
  discoveredAt: string;
  /** When metadata was last updated */
  lastScannedAt: string;
}

export interface ScanState {
  lastScanTimestamp: string;
  lastFullScanTimestamp: string;
  totalFilesIndexed: number;
  version: string;
}

export interface ScanOptions {
  /** Path to content directory */
  contentDir: string;
  /** Force full rescan (recompute all checksums) */
  full: boolean;
  /** Sync results to database */
  syncDb: boolean;
  /** Concurrency limit for file I/O */
  concurrency: number;
  /** Verbose logging */
  verbose: boolean;
}

export interface ScanReport {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalFiles: number;
  newFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  unchangedFiles: number;
  duplicates: number;
  errors: ScanError[];
  missingPairs: string[];
  byResourceType: Record<ResourceType, number>;
  byProvider: Record<string, number>;
  byLevel: Record<string, number>;
}

export interface ScanError {
  filePath: string;
  error: string;
  timestamp: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Provider Parser Interface
 * Each provider implements this to extract metadata from filenames/paths.
 */
export interface ProviderParser {
  /** Provider slug identifier */
  slug: string;
  /** Human-readable provider name */
  name: string;
  /** Test if a file path belongs to this provider */
  matches(relativePath: string): boolean;
  /** Extract metadata from the file path */
  extract(relativePath: string, fileName: string): Partial<ContentMetadata>;
}
