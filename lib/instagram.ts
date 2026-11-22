import 'server-only';

import { formatParisStamp, parisCivilToUtc, parisDateKey, addIsoDays } from './format';
import { redact } from './redact';
import type { AccountSnapshot, DailyFollow, RawPost } from './types';

const API = 'https://graph.facebook.com/v27.0';
const IG_USER_ID = '17841407468921719';
const BASELINE = '2026-10-29';
const WINDOW_SECONDS = 30 * 24 * 60 * 60 - 120;

type Json = Record<string, unknown>;

export type LivePull = {
  pulledAtLabel: string;
  account: AccountSnapshot;
  posts: RawPost[];
  daily: DailyFollow[];
  dailyZeroDays: number;
  dailyMissingDays: number;
};

class GraphError extends Error {}
class TokenError extends GraphError {}

function token(): string {
  const value = process.env.IG_ACCESS_TOKEN?.trim();
  if (!value) throw new GraphError('Falta IG_ACCESS_TOKEN.');
  return value;
}

function isTokenError(error: Json): boolean {
  const code = Number(error.code);
  if (code === 100) return false;
  if ([190, 102, 104, 463, 467].includes(code)) return true;
  const message = String(error.message ?? '');
  return /access token|session has expired|invalid oauth|error validating access token/i.test(message);
}

async function graphGet(path: string, params: Record<string, string | undefined>, secret: string): Promise<Json> {
  const url = new URL(`${API}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  let last = 'Instagram no respondió.';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (error) {
      last = redact(error instanceof Error ? error.message : 'Error de red', secret);
      await wait(400 * attempt);
      continue;
    }
    const text = await response.text();
    let payload: Json;
    try {
      payload = JSON.parse(text) as Json;
    } catch {
      last = `Instagram respondió sin JSON (HTTP ${response.status}).`;
      await wait(400 * attempt);
      continue;
    }
    const error = payload.error as Json | undefined;
    if (response.status === 429 || (error && [4, 17, 32, 613].includes(Number(error.code)))) {
      last = 'Instagram pidió esperar (límite de consultas).';
      await wait(800 * attempt);
      continue;
    }
    if (error) {
      if (isTokenError(error)) throw new TokenError('El token de Instagram no sirve. Hay que renovarlo en Vercel.');
      const message = redact(String(error.message || 'Error de Instagram'), secret);
      if (response.status >= 500 || [1, 2].includes(Number(error.code))) {
        last = message;
        await wait(400 * attempt);
        continue;
      }
      throw new GraphError(message);
    }
    if (!response.ok) throw new GraphError(`Instagram respondió HTTP ${response.status}.`);
    return payload;
  }
  throw new GraphError(last);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function metricValue(entry: Json): number | null {
  const total = entry.total_value as Json | undefined;
  if (total && typeof total.value === 'number') return total.value;
  const values = entry.values as Json[] | undefined;
  const last = values?.[values.length - 1];
  if (last && typeof last.value === 'number') return last.value;
  return null;
}

function followSplit(entry: Json | undefined): { followers: number | null; nonFollowers: number | null; unknown: number | null } {
  const empty = { followers: null, nonFollowers: null, unknown: null };
  if (!entry) return empty;
  const found = new Map<string, number>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const record = node as Json;
    if (Array.isArray(record.results)) {
      for (const row of record.results as Json[]) {
        const dims = (row.dimension_values as string[] | undefined) ?? [];
        const label = String(dims[0] ?? '').toUpperCase();
        if (typeof row.value === 'number' && label) found.set(label, row.value);
      }
    }
    for (const value of Object.values(record)) walk(value);
  };
  walk(entry);
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      if (found.has(key)) return found.get(key) ?? null;
    }
    return null;
  };
  return {
    followers: pick('FOLLOWER', 'FOLLOWERS'),
    nonFollowers: pick('NON_FOLLOWER', 'NON_FOLLOWERS', 'NONFOLLOWER'),
    unknown: pick('UNKNOWN'),
  };
}

async function insightNumbers(
  id: string,
  metrics: string[],
  secret: string,
  extra?: Record<string, string>,
): Promise<Map<string, { value: number | null; entry: Json }>> {
  const out = new Map<string, { value: number | null; entry: Json }>();
  const params = { metric: metrics.join(','), ...extra };
  try {
    const payload = await graphGet(`${id}/insights`, params, secret);
    for (const entry of (payload.data as Json[]) ?? []) {
      const name = String(entry.name ?? '');
      if (name) out.set(name, { value: metricValue(entry), entry });
    }
    return out;
  } catch (error) {
    if (error instanceof TokenError) throw error;
    if (metrics.length === 1) throw error;
  }
  for (const metric of metrics) {
    try {
      const payload = await graphGet(`${id}/insights`, { metric, ...extra }, secret);
      for (const entry of (payload.data as Json[]) ?? []) {
        const name = String(entry.name ?? metric);
        out.set(name, { value: metricValue(entry), entry });
      }
    } catch {
      out.set(metric, { value: null, entry: {} });
    }
  }
  return out;
}

const MEDIA_FIELDS = [
  'id',
  'timestamp',
  'caption',
  'permalink',
  'media_type',
  'media_product_type',
  'like_count',
  'comments_count',
  'thumbnail_url',
  'media_url',
  'is_shared_to_feed',
  'children{media_url,thumbnail_url}',
].join(',');

const MEDIA_FIELDS_BASIC = [
  'id',
  'timestamp',
  'caption',
  'permalink',
  'media_type',
  'media_product_type',
  'thumbnail_url',
  'media_url',
].join(',');

async function listMedia(secret: string): Promise<Json[]> {
  let fields = MEDIA_FIELDS;
  const items: Json[] = [];
  let after: string | undefined;
  let usedBasic = false;
  while (true) {
    let payload: Json;
    try {
      payload = await graphGet(`${IG_USER_ID}/media`, { fields, limit: '50', after }, secret);
    } catch (error) {
      if (!usedBasic && !after) {
        fields = MEDIA_FIELDS_BASIC;
        usedBasic = true;
        continue;
      }
      throw error;
    }
    const page = (payload.data as Json[]) ?? [];
    items.push(...page);
    const paging = payload.paging as Json | undefined;
    const cursors = paging?.cursors as Json | undefined;
    after = typeof cursors?.after === 'string' ? cursors.after : undefined;
    const hasNext = Boolean(paging?.next) && Boolean(after);
    if (!hasNext) break;
    const dates = page.map((row) => (typeof row.timestamp === 'string' ? parisDateKey(new Date(row.timestamp)) : ''));
    if (dates.length > 0 && dates.every((day) => day && day < BASELINE)) break;
  }
  return items;
}

function thumbnailFrom(media: Json): string | null {
  if (typeof media.thumbnail_url === 'string') return media.thumbnail_url;
  if (typeof media.media_url === 'string') return media.media_url;
  const children = (media.children as Json | undefined)?.data as Json[] | undefined;
  const first = children?.[0];
  if (!first) return null;
  if (typeof first.thumbnail_url === 'string') return first.thumbnail_url;
  if (typeof first.media_url === 'string') return first.media_url;
  return null;
}

async function soften<T>(promise: Promise<T>): Promise<T | Map<string, { value: number | null; entry: Json }>> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof TokenError) throw error;
    return new Map();
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function readPost(media: Json, secret: string): Promise<RawPost | null> {
  const timestamp = typeof media.timestamp === 'string' ? media.timestamp : null;
  const date = timestamp ? parisDateKey(new Date(timestamp)) : null;
  if (!date || date < BASELINE) return null;
  const id = String(media.id);
  const product = typeof media.media_product_type === 'string' ? media.media_product_type : null;
  const mediaType = typeof media.media_type === 'string' ? media.media_type : null;
  const reel = (product || '').toUpperCase() === 'REELS';
  const metrics = reel
    ? ['views', 'reach', 'saved', 'shares', 'likes', 'comments', 'reels_skip_rate', 'ig_reels_avg_watch_time']
    : ['views', 'reach', 'saved', 'shares', 'likes', 'comments', 'follows', 'profile_visits'];
  const got = await insightNumbers(id, metrics, secret);
  const read = (name: string) => got.get(name)?.value ?? null;
  const shared = media.is_shared_to_feed;
  return {
    id,
    permalink: typeof media.permalink === 'string' ? media.permalink : '',
    caption: typeof media.caption === 'string' ? media.caption : '',
    timestamp,
    date,
    mediaType,
    productType: product,
    views: read('views'),
    reach: read('reach'),
    saves: read('saved'),
    shares: read('shares'),
    likes: read('likes') ?? numberOrNull(media.like_count),
    comments: read('comments') ?? numberOrNull(media.comments_count),
    skipRate: read('reels_skip_rate'),
    avgWatchMs: read('ig_reels_avg_watch_time'),
    isSharedToFeed: typeof shared === 'boolean' ? shared : null,
    placement: null,
    thumbnailUrl: thumbnailFrom(media),
  };
}

async function accountTotals(secret: string, since: number, until: number): Promise<AccountSnapshot> {
  const profile = await graphGet(IG_USER_ID, { fields: 'followers_count,media_count,username' }, secret);
  const views = await soften(insightNumbers(
    IG_USER_ID,
    ['views'],
    secret,
    { period: 'day', metric_type: 'total_value', breakdown: 'follow_type', since: String(since), until: String(until) },
  ));
  const follows = await soften(insightNumbers(
    IG_USER_ID,
    ['follows_and_unfollows'],
    secret,
    { period: 'day', metric_type: 'total_value', breakdown: 'follow_type', since: String(since), until: String(until) },
  ));
  const plain = await soften(insightNumbers(
    IG_USER_ID,
    ['reach', 'shares', 'saves', 'accounts_engaged', 'total_interactions'],
    secret,
    { period: 'day', metric_type: 'total_value', since: String(since), until: String(until) },
  ));

  const viewEntry = views.get('views');
  const viewSplit = followSplit(viewEntry?.entry);
  const viewsTotal =
    viewEntry?.value ??
    (viewSplit.followers != null && viewSplit.nonFollowers != null
      ? viewSplit.followers + viewSplit.nonFollowers + (viewSplit.unknown ?? 0)
      : null);
  const followSplitValues = followSplit(follows.get('follows_and_unfollows')?.entry);
  const sinceDate = new Date(since * 1000);
  const untilDate = new Date(until * 1000);
  return {
    followers: numberOrNull(profile.followers_count),
    mediaCount: numberOrNull(profile.media_count),
    views: viewsTotal,
    viewsFollowers: viewSplit.followers,
    viewsNonFollowers: viewSplit.nonFollowers,
    viewsUnknown: viewSplit.unknown,
    reach: plain.get('reach')?.value ?? null,
    follows: followSplitValues.followers,
    unfollows: followSplitValues.nonFollowers,
    shares: plain.get('shares')?.value ?? null,
    saves: plain.get('saves')?.value ?? null,
    accountsEngaged: plain.get('accounts_engaged')?.value ?? null,
    interactions: plain.get('total_interactions')?.value ?? null,
    windowLabel: `Ventana de 30 días de la API: ${formatParisStamp(sinceDate).replace(' hora de París', '')} a ${formatParisStamp(untilDate)}.`,
  };
}

async function dailyFollows(secret: string, sinceMs: number, untilMs: number): Promise<{
  daily: DailyFollow[];
  zeroDays: number;
  missingDays: number;
}> {
  const start = parisDateKey(new Date(sinceMs));
  const days: string[] = [];
  for (let day = start; parisCivilToUtc(day).getTime() < untilMs; day = addIsoDays(day, 1)) {
    days.push(day);
  }
  const rows = await mapPool(days, 6, async (day) => {
    const from = parisCivilToUtc(day);
    const to = parisCivilToUtc(addIsoDays(day, 1));
    try {
      const got = await insightNumbers(
        IG_USER_ID,
        ['follows_and_unfollows'],
        secret,
        {
          period: 'day',
          metric_type: 'total_value',
          breakdown: 'follow_type',
          since: String(Math.floor(from.getTime() / 1000)),
          until: String(Math.floor(to.getTime() / 1000)),
        },
      );
      const split = followSplit(got.get('follows_and_unfollows')?.entry);
      return { date: day, follows: split.followers, unfollows: split.nonFollowers };
    } catch (error) {
      if (error instanceof TokenError) throw error;
      return { date: day, follows: null, unfollows: null };
    }
  });
  let zeroDays = 0;
  let missingDays = 0;
  const moving: DailyFollow[] = [];
  for (const row of rows) {
    if (row.follows == null || row.unfollows == null) {
      missingDays += 1;
      continue;
    }
    if (row.follows === 0 && row.unfollows === 0) {
      zeroDays += 1;
      continue;
    }
    const [, month, date] = row.date.split('-');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    moving.push({
      date: row.date,
      label: `${Number(date)} ${months[Number(month) - 1]}`,
      follows: row.follows,
      unfollows: row.unfollows,
    });
  }
  return { daily: moving, zeroDays, missingDays };
}

export async function pullInstagram(): Promise<LivePull> {
  const secret = token();
  const pulledAt = new Date();
  const until = Math.floor(pulledAt.getTime() / 1000);
  const since = until - WINDOW_SECONDS;
  const [media, account, dailyResult] = await Promise.all([
    listMedia(secret),
    accountTotals(secret, since, until),
    dailyFollows(secret, since * 1000, until * 1000),
  ]);
  const posts = (await mapPool(media, 6, (item) => readPost(item, secret))).filter((post): post is RawPost => post !== null);
  posts.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''));
  return {
    pulledAtLabel: formatParisStamp(pulledAt),
    account,
    posts,
    daily: dailyResult.daily,
    dailyZeroDays: dailyResult.zeroDays,
    dailyMissingDays: dailyResult.missingDays,
  };
}

export async function freshThumbnail(mediaId: string): Promise<string | null> {
  const secret = token();
  if (!/^\d+$/.test(mediaId)) return null;
  const media = await graphGet(mediaId, { fields: 'thumbnail_url,media_url,media_type,children{media_url,thumbnail_url}' }, secret);
  return thumbnailFrom(media);
}
