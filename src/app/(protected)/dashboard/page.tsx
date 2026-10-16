import { DashboardContent } from '@/features/dashboard/components/dashboard-content';

/**
 * Dashboard is publicly accessible — no auth required.
 * Display name and level come from the client-side LocalProfile (localStorage).
 * DashboardContent reads LocalProfile itself on the client.
 */
export default function DashboardPage() {
  return <DashboardContent displayName="CFA Student" level="I" />;
}
