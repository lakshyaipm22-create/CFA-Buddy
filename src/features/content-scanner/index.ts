/**
 * Content Scanner — Public API
 * 
 * Use this module to invoke the scanner from anywhere:
 * - CLI: `npm run scan:content`
 * - Admin UI: import { ContentScanner } from '@/features/content-scanner'
 * - Tests: import { ContentScanner } from '@/features/content-scanner'
 */
export { ContentScanner } from './scanner';
export type {
  ContentMetadata,
  ScanOptions,
  ScanReport,
  ScanState,
  ScanError,
  ResourceType,
  ResourceStatus,
  LogEntry,
  LogLevel,
  ProviderParser,
} from './types';
export { findParser, parserRegistry } from './parsers';
export { inferProvider, inferLevel } from './config/provider-mapping';
export { resolveSubject, inferSubject } from './config/subject-mapping';
export { detectPairs } from './utils/pair-detector';
export { detectVersions } from './utils/version-detector';
export { computeChecksum } from './utils/checksum';
