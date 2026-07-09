import { getReadingResources } from '@/features/learning-workspace/queries/get-curriculum';
import { ReadingWorkspace } from '@/features/learning-workspace/components/reading-workspace';
import Link from 'next/link';

interface Props {
  params: Promise<{ subjectId: string; readingId: string }>;
}

export default async function ReadingPage({ params }: Props) {
  const { subjectId, readingId } = await params;
  const subject = decodeURIComponent(subjectId);
  const reading = decodeURIComponent(readingId);
  const resources = await getReadingResources(subject, reading, 1);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/learn/${encodeURIComponent(subject)}`} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to {subject}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-white">{reading}</h1>
        <p className="mt-1 text-sm text-zinc-400">{subject} • {resources.length} resources</p>
      </div>

      <ReadingWorkspace subject={subject} reading={reading} resources={resources} />
    </div>
  );
}
