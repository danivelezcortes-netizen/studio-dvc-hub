import { unstable_cache } from 'next/cache';
import analysisJson from '@/data/analysis.json';
import { loadFixture } from './fixture';
import { freshThumbnail, pullInstagram } from './instagram';
import { toPostView } from './metrics';
import type { Analysis, DashboardData } from './types';

const analysis = analysisJson as Analysis;

type CachedPull = {
  data: DashboardData;
  thumbnails: Record<string, string>;
};

async function loadLive(): Promise<CachedPull> {
  const pull = await pullInstagram();
  const thumbnails: Record<string, string> = {};
  const posts = pull.posts
    .map((raw) => {
      if (raw.thumbnailUrl) thumbnails[raw.id] = raw.thumbnailUrl;
      return toPostView(raw, analysis.posts[raw.id]);
    })
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.timeParis ?? '').localeCompare(a.timeParis ?? ''));

  return {
    thumbnails,
    data: {
      source: 'live',
      pulledAtLabel: pull.pulledAtLabel,
      account: pull.account,
      posts,
      daily: pull.daily,
      dailyZeroDays: pull.dailyZeroDays,
      dailyMissingDays: pull.dailyMissingDays,
      analysis,
    },
  };
}

const cachedLive = unstable_cache(loadLive, ['studio-dvc-ig-v1'], { revalidate: 3600 });

export async function loadDashboard(): Promise<DashboardData> {
  if (!process.env.IG_ACCESS_TOKEN?.trim()) return loadFixture(analysis);
  const cached = await cachedLive();
  return cached.data;
}

export async function loadThumbnail(mediaId: string): Promise<string | null> {
  if (!process.env.IG_ACCESS_TOKEN?.trim()) return null;
  if (!/^\d+$/.test(mediaId)) return null;
  const cached = await cachedLive();
  return cached.thumbnails[mediaId] ?? freshThumbnail(mediaId);
}
