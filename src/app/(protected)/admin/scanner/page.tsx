import { ScannerDashboard } from '@/features/content-scanner/components/scanner-dashboard';

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Content Scanner</h1>
        <p className="mt-1 text-zinc-400">
          Manage your content library index. Scan to discover new files.
        </p>
      </div>
      <ScannerDashboard />
    </div>
  );
}
