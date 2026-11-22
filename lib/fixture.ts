import { readFileSync } from 'node:fs';
import path from 'node:path';
import meta from '@/data/fixtures/meta.json';
import { csvBoolean, csvNumber, parseCsv } from './csv';
import { toPostView } from './metrics';
import type { Analysis, DashboardData, Placement, RawPost } from './types';

type Meta = {
  pulledAtLabel: string;
  windowLabel: string;
  account: Omit<DashboardData['account'], 'windowLabel'>;
  times: Record<string, string>;
  daily: DashboardData['daily'];
};

const fixtureMeta = meta as Meta;

export function loadFixture(analysis: Analysis): DashboardData {
  const csv = readFileSync(path.join(process.cwd(), 'data/fixtures/posts_latest.csv'), 'utf8');
  const rows = parseCsv(csv);
  const posts = rows
    .map((row) => {
      const id = row.media_id;
      const timestamp = fixtureMeta.times[id] ?? null;
      const placement = row.placement === 'grid' || row.placement === 'not_on_grid' ? (row.placement as Placement) : null;
      const raw: RawPost = {
        id,
        permalink: row.permalink ?? '',
        caption: row.caption_snippet ?? '',
        timestamp,
        date: row.date || null,
        mediaType: row.type === 'FEED' ? 'CAROUSEL_ALBUM' : 'VIDEO',
        productType: row.type || null,
        views: csvNumber(row.views),
        reach: csvNumber(row.reach),
        saves: csvNumber(row.saved),
        shares: csvNumber(row.shares),
        likes: csvNumber(row.likes),
        comments: csvNumber(row.comments),
        skipRate: csvNumber(row.reels_skip_rate),
        avgWatchMs: csvNumber(row.ig_reels_avg_watch_time),
        isSharedToFeed: csvBoolean(row.is_shared_to_feed),
        placement,
        thumbnailUrl: null,
      };
      return toPostView(raw, analysis.posts[id]);
    })
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.timeParis ?? '').localeCompare(a.timeParis ?? ''));

  return {
    source: 'fixture',
    pulledAtLabel: fixtureMeta.pulledAtLabel,
    account: { ...fixtureMeta.account, windowLabel: fixtureMeta.windowLabel },
    posts,
    daily: fixtureMeta.daily,
    dailyZeroDays: null,
    dailyMissingDays: null,
    analysis,
  };
}
