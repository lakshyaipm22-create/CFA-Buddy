export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--nav-hover-bg)]" />
      <div className="h-4 w-80 rounded bg-[var(--nav-hover-bg)]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]" />
    </div>
  );
}
