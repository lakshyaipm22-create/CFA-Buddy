import { getSubjectReadings } from '@/features/learning-workspace/queries/get-curriculum';
import { getSubjectHierarchy } from '@/features/learning-workspace/queries/hierarchy';
import Link from 'next/link';
import { SubjectStudyHub } from '@/features/study-hub/components/subject-study-hub';

interface Props {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectPage({ params }: Props) {
  const { subjectId } = await params;
  const subject = decodeURIComponent(subjectId);
  const readings = await getSubjectReadings(subject, 1);
  const hierarchy = getSubjectHierarchy(subject, 1);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/learn" className="text-xs text-zinc-500 hover:text-zinc-300">
          {'\u2190'} Back to Subjects
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-white">{subject}</h1>
        <p className="mt-1 text-zinc-400">
          {readings.length} readings available
          {hierarchy && ` \u2022 ${hierarchy.readings.reduce((sum, r) => sum + r.topics.length, 0)} topics \u2022 Weight: ${(hierarchy.weight * 100).toFixed(0)}%`}
        </p>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/learn" className="hover:text-zinc-300 transition-colors">Level I</Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">{subject}</span>
      </nav>

      {/* Study Hub - client component for progress and quick actions */}
      <SubjectStudyHub subjectName={subject} />

      {/* Readings List */}
      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          Curriculum Readings
        </h2>
        <div className="space-y-2">
          {readings.map((reading, idx) => {
            const hierarchyReading = hierarchy?.readings.find(r => r.name === reading.name);
            const topicCount = hierarchyReading?.topics.length ?? 0;

            return (
              <Link
                key={reading.name}
                href={`/learn/${encodeURIComponent(subject)}/${encodeURIComponent(reading.name)}`}
                className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white">
                    {reading.readingNumber ?? idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                      {reading.name}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {reading.providers.map((p) => (
                        <span key={p} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {p}
                        </span>
                      ))}
                      {topicCount > 0 && (
                        <span className="rounded bg-[#002B5C]/30 px-1.5 py-0.5 text-[10px] text-[#C5A258]">
                          {topicCount} topics
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">{reading.resources.length} files</span>
              </Link>
            );
          })}
        </div>

        {readings.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-700 p-12 text-center">
            <p className="text-zinc-400">No readings found for this subject.</p>
          </div>
        )}
      </div>
    </div>
  );
}
