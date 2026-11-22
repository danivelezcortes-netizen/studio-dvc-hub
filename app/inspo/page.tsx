import { InspoApp } from '@/components/inspo/inspo-app';
import { Shell } from '@/components/Shell';
import { getStore } from '@/lib/inspo/store';

export const dynamic = 'force-dynamic';

export default async function InspoPage() {
  try {
    const board = await getStore().load();
    return (
      <Shell active="inspo">
        <InspoApp initial={board} />
      </Shell>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo abrir Inspo.";
    return (
      <Shell active="inspo">
        <p className="px-4 py-8 text-sm" role="alert">
          {message}
        </p>
      </Shell>
    );
  }
}
