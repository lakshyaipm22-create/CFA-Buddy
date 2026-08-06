import { getResourceById } from '@/features/resource-library/queries/get-resources';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(
  () => import('@/features/resource-library/components/pdf-viewer').then((m) => m.PdfViewer),
  {
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C5A258]" />
          <p className="text-sm text-zinc-500">Loading PDF viewer...</p>
        </div>
      </div>
    ),
  }
);

interface Props {
  params: Promise<{ resourceId: string }>;
}

export default async function ResourceViewerPage({ params }: Props) {
  const { resourceId } = await params;
  const resource = await getResourceById(resourceId);

  if (!resource) {
    notFound();
  }

  const pdfUrl = `/api/content/${resource.relativePath}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <Link
            href="/resources"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            &larr; Back to Library
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-white">{resource.fileName}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            {resource.provider && <span className="rounded bg-zinc-800 px-2 py-0.5">{resource.provider}</span>}
            {resource.subject && <span>{resource.subject}</span>}
            {resource.reading && <span>• {resource.reading}</span>}
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-zinc-800">
        <PdfViewer url={pdfUrl} resourceId={resource.id} />
      </div>
    </div>
  );
}
