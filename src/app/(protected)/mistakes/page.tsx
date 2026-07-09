import { MistakeBook } from '@/features/mistake-book/components/mistake-book';

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
    </div>
  );
}
