export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
