export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--nav-hover-bg)]" />
      <div className="h-10 w-full rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-24 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]" />
        ))}
      </div>
    </div>
  );
}
