import { createHash } from 'crypto';
import { createReadStream } from 'fs';

/**
 * Compute SHA256 checksum of a file using streaming (memory efficient).
 * Works for files of any size without loading entire content into memory.
 */
export function computeChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}
