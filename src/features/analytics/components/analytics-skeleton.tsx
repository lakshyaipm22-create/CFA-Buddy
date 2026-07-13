'use client';

/**
 * Loading skeleton for the analytics dashboard.
 * Uses CSS variables for dark mode compatibility and pulse animation.
 */
export function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="flex items-center gap-3">
        <div
          className="h-6 w-6 rounded"
          style={{ backgroundColor: 'var(--card-border)' }}
        />
        <div className="space-y-2">
          <div
            className="h-6 w-40 rounded"
            style={{ backgroundColor: 'var(--card-border)' }}
          />
          <div
            className="h-4 w-64 rounded"
            style={{ backgroundColor: 'var(--card-border)', opacity: 0.6 }}
          />
        </div>
      </div>

      {/* Aggregate Stats Skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div
              className="mx-auto h-3 w-16 rounded"
              style={{ backgroundColor: 'var(--card-border)', opacity: 0.6 }}
            />
            <div
              className="mx-auto mt-3 h-8 w-20 rounded"
              style={{ backgroundColor: 'var(--card-border)' }}
            />
          </div>
        ))}
      </div>

      {/* Tab Navigation Skeleton */}
      <div
        className="flex items-center gap-1 rounded-xl border p-1"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-lg"
            style={{ backgroundColor: 'var(--card-border)', opacity: i === 0 ? 1 : 0.4 }}
          />
        ))}
      </div>

      {/* Session Cards Skeleton */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="h-4 w-20 rounded"
                style={{ backgroundColor: 'var(--card-border)' }}
              />
              <div
                className="h-5 w-12 rounded-full"
                style={{ backgroundColor: 'var(--card-border)', opacity: 0.6 }}
              />
            </div>
            <div
              className="h-3 w-full rounded"
              style={{ backgroundColor: 'var(--card-border)', opacity: 0.4 }}
            />
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-16 rounded"
                style={{ backgroundColor: 'var(--card-border)', opacity: 0.5 }}
              />
              <div
                className="h-3 w-12 rounded"
                style={{ backgroundColor: 'var(--card-border)', opacity: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the individual session analysis page.
 */
export function SessionAnalysisSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 animate-pulse md:p-6">
      {/* Back link skeleton */}
      <div
        className="h-4 w-32 rounded"
        style={{ backgroundColor: 'var(--card-border)', opacity: 0.6 }}
      />

      {/* Header card skeleton */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
          {/* Score ring placeholder */}
          <div
            className="h-32 w-32 rounded-full"
            style={{ backgroundColor: 'var(--card-border)' }}
          />
          <div className="flex-1 space-y-3">
            <div
              className="h-6 w-48 rounded"
              style={{ backgroundColor: 'var(--card-border)' }}
            />
            <div
              className="h-4 w-32 rounded"
              style={{ backgroundColor: 'var(--card-border)', opacity: 0.6 }}
            />
            <div
              className="h-4 w-64 rounded"
              style={{ backgroundColor: 'var(--card-border)', opacity: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div
              className="mx-auto h-3 w-16 rounded"
              style={{ backgroundColor: 'var(--card-border)', opacity: 0.6 }}
            />
            <div
              className="mx-auto mt-3 h-7 w-14 rounded"
              style={{ backgroundColor: 'var(--card-border)' }}
            />
          </div>
        ))}
      </div>

      {/* Section skeleton */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <div
          className="h-5 w-40 rounded"
          style={{ backgroundColor: 'var(--card-border)' }}
        />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-full rounded-lg"
              style={{ backgroundColor: 'var(--card-border)', opacity: 0.3 + i * 0.1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
