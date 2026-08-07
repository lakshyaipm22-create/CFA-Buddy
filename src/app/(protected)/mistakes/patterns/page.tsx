import dynamic from 'next/dynamic';

const PatternDashboard = dynamic(
  () =>
    import('@/features/mistake-patterns/components/pattern-dashboard').then(
      (m) => m.PatternDashboard
    ),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      </div>
    ),
  }
);

export default function MistakePatternsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <PatternDashboard />
    </div>
  );
}
