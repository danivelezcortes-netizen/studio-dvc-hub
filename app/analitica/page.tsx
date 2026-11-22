import { Dashboard } from '@/components/Dashboard';
import { Shell } from '@/components/Shell';
import { loadDashboard } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export default async function AnalyticsPage() {
  const data = await loadDashboard();
  return (
    <Shell active="analitica">
      <Dashboard data={data} />
    </Shell>
  );
}
