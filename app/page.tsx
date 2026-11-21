import { Dashboard } from '@/components/Dashboard';
import { Shell } from '@/components/Shell';
import { loadDashboard } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export default async function Page() {
  const data = await loadDashboard();
  return (
    <Shell>
      <Dashboard data={data} />
    </Shell>
  );
}
