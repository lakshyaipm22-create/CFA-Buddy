'use client';

import { ErrorFallback } from '@/shared/components/feedback/error-boundary';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
