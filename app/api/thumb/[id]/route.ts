import { NextResponse } from 'next/server';
import { freshThumbnail } from '@/lib/instagram';
import { loadThumbnail } from '@/lib/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 404 });
  let url = await loadThumbnail(id);
  let image = url ? await fetch(url, { cache: 'no-store' }) : null;
  if (!image || !image.ok) {
    url = await freshThumbnail(id).catch(() => null);
    image = url ? await fetch(url, { cache: 'no-store' }) : null;
  }
  if (!image || !image.ok) return new NextResponse(null, { status: 404 });
  const type = image.headers.get('content-type') ?? 'image/jpeg';
  return new NextResponse(image.body, {
    headers: {
      'content-type': type,
      'cache-control': 'private, max-age=3600',
    },
  });
}
