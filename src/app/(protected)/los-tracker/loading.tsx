export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-[var(--nav-hover-bg)]" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]" />
        ))}
      </div>
      <div className="h-32 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]" />
    </div>
  );
}
