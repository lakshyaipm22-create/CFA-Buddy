import { readdir, stat } from 'fs/promises';
import { join, relative, extname, basename } from 'path';

export interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  fileSize: number;
  modifiedTime: string;
}

/**
 * Recursively discover all PDF files in a directory.
 * Skips hidden files/folders (starting with .)
 * Skips metadata/ folder.
 */
export async function discoverFiles(contentDir: string): Promise<DiscoveredFile[]> {
  const files: DiscoveredFile[] = [];
  await walkDirectory(contentDir, contentDir, files);
  return files;
}

async function walkDirectory(
  currentPath: string,
  rootDir: string,
  results: DiscoveredFile[]
): Promise<void> {
  let entries;
  try {
    entries = await readdir(currentPath, { withFileTypes: true });
  } catch {
    // Skip unreadable directories
    return;
  }

  for (const entry of entries) {
    // Skip hidden files/folders and metadata
    if (entry.name.startsWith('.') || entry.name === 'metadata') continue;
    // Skip system files
    if (entry.name === 'desktop.ini' || entry.name === 'Thumbs.db') continue;

    const fullPath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, rootDir, results);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === '.pdf') {
        try {
          const fileStat = await stat(fullPath);
          results.push({
            absolutePath: fullPath,
            relativePath: relative(rootDir, fullPath),
            fileName: basename(entry.name),
            extension: ext.slice(1), // Remove the dot
            fileSize: fileStat.size,
            modifiedTime: fileStat.mtime.toISOString(),
          });
        } catch {
          // Skip files we can't stat
        }
      }
    }
  }
}
