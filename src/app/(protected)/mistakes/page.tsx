import { RelatedActions } from '@/shared/components/ui/related-actions';
import dynamic from 'next/dynamic';

const MistakeBook = dynamic(
  () => import('@/features/mistake-book/components/mistake-book').then((m) => m.MistakeBook),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }} />
          ))}
        </div>
        <div className="h-12 animate-pulse rounded-lg" style={{ background: 'var(--card-bg)' }} />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }} />
          ))}
        </div>
      </div>
    ),
  }
);

export default function MistakesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Mistake Book</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Track and learn from your errors. Identify patterns to eliminate mistakes.
        </p>
      </div>
      <MistakeBook />

      <RelatedActions
        items={[
          {
            href: '/mistakes/patterns',
            icon: 'Activity',
            label: 'Pattern Analysis',
            description: 'Deep AI-powered insights',
          },
          {
            href: '/practice',
            icon: 'Repeat',
            label: 'Practice',
            description: 'Retry weak topics',
          },
          {
            href: '/questions',
            icon: 'BookOpen',
            label: 'Questions',
            description: 'Start new session',
          },
        ]}
      />
    </div>
  );
}
