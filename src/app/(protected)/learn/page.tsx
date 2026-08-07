import { getCurriculumSubjects } from '@/features/learning-workspace/queries/get-curriculum';
import Link from 'next/link';
import { GitBranch, MessageCircle } from 'lucide-react';
import { SubjectProgressBadge } from './subject-progress-indicators';

export const revalidate = 3600;

export default async function LearnPage() {
  const subjects = await getCurriculumSubjects(1);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Learn</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          CFA Level I — Select a subject to begin studying.
        </p>
      </div>

      {/* Learning Tools */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/learn/concepts"
          className="group flex items-start gap-4 rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(197, 162, 88, 0.1)' }}
          >
            <GitBranch className="h-5 w-5" style={{ color: '#C5A258' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Concept Map
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
              Visualize how CFA topics connect and identify knowledge gaps.
            </p>
          </div>
        </Link>
        <Link
          href="/learn/tutor"
          className="group flex items-start gap-4 rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(0, 132, 61, 0.1)' }}
          >
            <MessageCircle className="h-5 w-5" style={{ color: '#00843D' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              AI Tutor
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
              Ask questions and get explanations powered by your study materials.
            </p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {subjects.map((subject) => (
          <Link
            key={subject.name}
            href={`/learn/${encodeURIComponent(subject.name)}`}
            className="group rounded-lg border p-5 transition-colors"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: '#C5A258' }}>
                  {subject.abbreviation}
                </span>
                <h3 className="mt-1 text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  {subject.name}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {subject.resourceCount}
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>resources</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {subject.providers.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="rounded px-2 py-0.5 text-[10px]"
                  style={{ background: 'var(--card-border)', color: 'var(--foreground-secondary)' }}
                >
                  {p}
                </span>
              ))}
            </div>
            {subject.readings.length > 0 && (
              <p className="mt-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {subject.readings.length} readings
              </p>
            )}
            <SubjectProgressBadge subjectName={subject.name} />
          </Link>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <p style={{ color: 'var(--foreground-secondary)' }}>No content indexed yet. Run the scanner first.</p>
        </div>
      )}
    </div>
  );
}
