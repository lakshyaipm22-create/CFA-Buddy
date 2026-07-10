export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded bg-[var(--nav-hover-bg)]" />
      <div className="h-64 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]" />
    </div>
  );
}
