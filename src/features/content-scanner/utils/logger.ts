import type { LogEntry, LogLevel } from '../types';

export class ScannerLogger {
  private entries: LogEntry[] = [];
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log('error', message, data);
  }

  success(message: string, data?: Record<string, unknown>) {
    this.log('success', message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this.entries.push(entry);

    if (this.verbose || level === 'error' || level === 'success') {
      const prefix = this.getPrefix(level);
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`${prefix} ${entry.timestamp.split('T')[1]?.slice(0, 8)} ${message}${dataStr}`);
    }
  }

  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'info': return '  ℹ️ ';
      case 'warn': return '  ⚠️ ';
      case 'error': return '  ❌';
      case 'success': return '  ✅';
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getErrors(): LogEntry[] {
    return this.entries.filter((e) => e.level === 'error');
  }

  getWarnings(): LogEntry[] {
    return this.entries.filter((e) => e.level === 'warn');
  }
}
