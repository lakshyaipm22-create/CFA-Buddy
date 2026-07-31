import { Repeat, BookOpen, BarChart3 } from 'lucide-react';
import { MistakeBook } from '@/features/mistake-book/components/mistake-book';
import { RelatedActions } from '@/shared/components/ui/related-actions';

export default function MistakesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mistake Book</h1>
        <p className="mt-1 text-zinc-400">
          Track and learn from your errors. Identify patterns to eliminate mistakes.
        </p>
      </div>
      <MistakeBook />

      <RelatedActions
        items={[
          {
            href: '/practice',
            icon: Repeat,
            label: 'Practice',
            description: 'Retry weak topics',
          },
          {
            href: '/questions',
            icon: BookOpen,
            label: 'Questions',
            description: 'Start new session',
          },
          {
            href: '/insights',
            icon: BarChart3,
            label: 'Insights',
            description: 'Error patterns',
          },
        ]}
      />
    </div>
  );
}
