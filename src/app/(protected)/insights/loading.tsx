export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--nav-hover-bg)]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]" />)}
      </div>
      <div className="h-64 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]" />
    </div>
  );
}
