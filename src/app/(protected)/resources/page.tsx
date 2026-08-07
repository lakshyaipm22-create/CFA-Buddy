import { getResourcesGrouped, getSubjects } from '@/features/resource-library/queries/get-resources';
import { ResourceBrowser } from '@/features/resource-library/components/resource-browser';

export const revalidate = 3600;

export default async function ResourcesPage() {
  const subjects = await getSubjects(1); // Level I by default
  const grouped = await getResourcesGrouped({ level: 1 });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Resource Library</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Browse your CFA study materials by subject and provider.
        </p>
      </div>
      <ResourceBrowser subjects={subjects} initialResources={grouped} />
    </div>
  );
}
