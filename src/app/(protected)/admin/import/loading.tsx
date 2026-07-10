export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--nav-hover-bg)]" />
      <div className="h-48 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]" />
    </div>
  );
}
