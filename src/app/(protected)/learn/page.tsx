import { getCurriculumSubjects } from '@/features/learning-workspace/queries/get-curriculum';
import Link from 'next/link';
import { SubjectProgressBadge } from './subject-progress-indicators';

export const revalidate = 3600;

export default async function LearnPage() {
  const subjects = await getCurriculumSubjects(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Learn</h1>
        <p className="mt-1 text-zinc-400">CFA Level I — Select a subject to begin studying.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {subjects.map((subject) => (
          <Link
            key={subject.name}
            href={`/learn/${encodeURIComponent(subject.name)}`}
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-blue-400">{subject.abbreviation}</span>
                <h3 className="mt-1 text-base font-semibold text-zinc-200 group-hover:text-white">
                  {subject.name}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{subject.resourceCount}</p>
                <p className="text-xs text-zinc-500">resources</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {subject.providers.slice(0, 5).map((p) => (
                <span key={p} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                  {p}
                </span>
              ))}
            </div>
            {subject.readings.length > 0 && (
              <p className="mt-2 text-xs text-zinc-600">{subject.readings.length} readings</p>
            )}
            <SubjectProgressBadge subjectName={subject.name} />
          </Link>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-zinc-400">No content indexed yet. Run the scanner first.</p>
        </div>
      )}
    </div>
  );
}
