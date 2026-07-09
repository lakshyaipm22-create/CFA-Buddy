import { ImportDashboard } from '@/features/question-bank/components/import-dashboard';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Question Import</h1>
        <p className="mt-1 text-zinc-400">
          Import questions from PDF question banks into the system.
        </p>
      </div>
      <ImportDashboard />
    </div>
  );
}
