const SEED_VERSION_KEY = 'cfa-buddy-seeded-v6';

/**
 * Runs all seed functions only if data hasn't been seeded yet.
 * Uses a simple version-flag in localStorage to avoid parsing the
 * entire attempts blob (160KB+) on every page load.
 *
 * After seeding completes, sets the flag so subsequent calls are a
 * single string check instead of 9 JSON parses.
 */
export function runSeedsIfNeeded(
  seedFns: Array<() => unknown>
): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_VERSION_KEY)) return;

  for (const fn of seedFns) {
    fn();
  }

  localStorage.setItem(SEED_VERSION_KEY, '1');
}
