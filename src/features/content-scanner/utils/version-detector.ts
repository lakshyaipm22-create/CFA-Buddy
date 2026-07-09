import type { ContentMetadata } from '../types';

/**
 * Detect versions among resources and mark the latest as active.
 * Groups resources by (provider, subject, reading) and compares years.
 * The resource with the highest year gets isLatest=true; others get isLatest=false.
 * Resources without a year are always marked as latest.
 */
export function detectVersions(resources: ContentMetadata[]): void {
  // Group by a key that represents "the same content from different years"
  const groups = new Map<string, ContentMetadata[]>();

  for (const resource of resources) {
    const key = buildVersionGroupKey(resource);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(resource);
  }

  // For each group, mark the latest version
  for (const group of groups.values()) {
    if (group.length === 1) {
      group[0].isLatest = true;
      group[0].status = 'active';
      continue;
    }

    // Sort by year descending (null years go first as "latest")
    group.sort((a, b) => {
      if (a.year === null && b.year === null) return 0;
      if (a.year === null) return -1;
      if (b.year === null) return 1;
      return b.year - a.year;
    });

    // Mark latest
    group[0].isLatest = true;
    group[0].status = 'active';

    // Mark older versions
    for (let i = 1; i < group.length; i++) {
      group[i].isLatest = false;
      group[i].status = 'inactive';
    }
  }
}



/**
 * Build a grouping key for version comparison.
 * Resources with the same key are considered versions of the same content.
 */
function buildVersionGroupKey(resource: ContentMetadata): string {
  const parts = [
    resource.provider ?? 'unknown',
    resource.subject ?? 'unknown',
    resource.readingNumber?.toString() ?? resource.reading ?? 'unknown',
    resource.resourceType,
  ];
  return parts.join('::').toLowerCase();
}
