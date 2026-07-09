/**
 * Maps folder path segments to provider slugs.
 * The scanner uses folder structure as the primary provider signal.
 */
export interface ProviderInfo {
  slug: string;
  name: string;
}

/**
 * Folder path segment → provider mapping.
 * Order matters: first match wins.
 */
export const folderProviderMap: Array<{ pattern: RegExp; provider: ProviderInfo }> = [
  { pattern: /\/curriculum\//i, provider: { slug: 'curriculum', name: 'CFA Institute Curriculum 2026' } },
  { pattern: /\/schweser\//i, provider: { slug: 'schweser', name: 'Kaplan Schweser' } },
  { pattern: /\/ift\//i, provider: { slug: 'ift', name: 'IFT (Irfanullah Financial Training)' } },
  { pattern: /\/mark-meldrum\//i, provider: { slug: 'mark-meldrum', name: 'Mark Meldrum' } },
  { pattern: /\/fintree\//i, provider: { slug: 'fintree', name: 'Fintree' } },
  { pattern: /\/juice\//i, provider: { slug: 'fintree', name: 'Fintree' } }, // juice is under fintree
  { pattern: /\/personal\//i, provider: { slug: 'personal', name: 'Personal' } },
  { pattern: /uworld/i, provider: { slug: 'uworld', name: 'UWorld' } },
  { pattern: /25th hour/i, provider: { slug: '25th-hour', name: '25th Hour' } },
  { pattern: /premium practice/i, provider: { slug: 'curriculum', name: 'CFA Institute Curriculum 2026' } },
  { pattern: /schweser.*q.*b/i, provider: { slug: 'schweser', name: 'Kaplan Schweser' } },
  { pattern: /kevin sir/i, provider: { slug: 'kevin-sir', name: 'Kevin Sir' } },
];

/**
 * Infer provider from a relative file path.
 * Returns the first matching provider or null.
 */
export function inferProvider(relativePath: string): ProviderInfo | null {
  for (const entry of folderProviderMap) {
    if (entry.pattern.test(relativePath)) {
      return entry.provider;
    }
  }
  return null;
}

/**
 * Infer CFA Level from a relative file path.
 * Looks for /level1/, /level2/, /level3/ patterns or L1, L2, L3 in filenames.
 */
export function inferLevel(relativePath: string): number | null {
  const folderMatch = relativePath.match(/\/level(\d)\//i);
  if (folderMatch) return parseInt(folderMatch[1], 10);

  const filenameMatch = relativePath.match(/\bL(\d)\b/);
  if (filenameMatch) return parseInt(filenameMatch[1], 10);

  return null;
}
