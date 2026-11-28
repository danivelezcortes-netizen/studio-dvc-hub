import { unstable_cache } from 'next/cache';
import analysisJson from '@/data/analysis.json';
import { loadFixture } from './fixture';
import { freshThumbnail, pullInstagram, type LivePull } from './instagram';
import { toPostView } from './metrics';
import type { Analysis, DashboardData } from './types';

const analysis = analysisJson as Analysis;

type CachedPull = {
  pull: LivePull;
  thumbnails: Record<string, string>;
};

async function loadLive(): Promise<CachedPull> {
  const pull = await pullInstagram();
  const thumbnails: Record<string, string> = {};
  for (const raw of pull.posts) {
    if (raw.thumbnailUrl) thumbnails[raw.id] = raw.thumbnailUrl;
  }
  return { pull, thumbnails };
}

// v2: cache only the Instagram pull. analysis.json is applied after the cache
// so a Sunday text update is not stuck behind the 1-hour live-data entry.
const cachedLive = unstable_cache(loadLive, ['studio-dvc-ig-v2'], { revalidate: 3600 });

function toDashboard(pull: LivePull): DashboardData {
  const posts = pull.posts
    .map((raw) => toPostView(raw, analysis.posts[raw.id]))
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.timeParis ?? '').localeCompare(a.timeParis ?? ''));

  return {
    source: 'live',
    pulledAtLabel: pull.pulledAtLabel,
    account: pull.account,
    posts,
    daily: pull.daily,
    dailyZeroDays: pull.dailyZeroDays,
    dailyMissingDays: pull.dailyMissingDays,
    analysis,
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  if (!process.env.IG_ACCESS_TOKEN?.trim()) return loadFixture(analysis);
  const cached = await cachedLive();
  return toDashboard(cached.pull);
}

export async function loadThumbnail(mediaId: string): Promise<string | null> {
  if (!process.env.IG_ACCESS_TOKEN?.trim()) return null;
  if (!/^\d+$/.test(mediaId)) return null;
  const cached = await cachedLive();
  return cached.thumbnails[mediaId] ?? freshThumbnail(mediaId);
}
