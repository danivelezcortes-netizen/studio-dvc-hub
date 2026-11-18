import { judgingRules } from '../config/rules';
import {
  bandLabel,
  ratioByKey,
  type Band,
  type RatioConfig,
  type RatioKey,
} from '../config/thresholds';
import type { Analytics, Post, Week } from '../types';

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function formatOneDecimal(value: number): string {
  const rounded = roundTo(value, 1);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatPercentFromFraction(fraction: number): string {
  return `${formatOneDecimal(fraction * 100)}%`;
}

export function formatPercentValue(percent: number): string {
  return `${formatOneDecimal(percent)}%`;
}

export function formatLongDate(isoDate: string): string {
  return formatDate(isoDate, true);
}

export function formatShortDate(isoDate: string): string {
  return formatDate(isoDate, false);
}

function formatDate(isoDate: string, withYear: boolean): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(date);
}

export function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Paris',
  }).format(date);
}

export function weeksInOrder(data: Analytics): Week[] {
  return data.weeks
    .filter((week) => week.weekStart >= data.baselineStart)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function postsInScope(data: Analytics): Post[] {
  return data.posts.filter((post) => post.date >= data.baselineStart);
}

export function latestWeeks(data: Analytics): { current: Week | null; previous: Week | null } {
  const weeks = weeksInOrder(data);
  return {
    current: weeks.at(-1) ?? null,
    previous: weeks.length > 1 ? weeks[weeks.length - 2] : null,
  };
}

export type Stat = {
  id: string;
  label: string;
  plain: string;
  value: string | null;
  change: string | null;
};

export function latestSummary(data: Analytics): {
  current: Week | null;
  previous: Week | null;
  stats: Stat[];
} {
  const { current, previous } = latestWeeks(data);
  const stats: Stat[] = [
    countStat('views', 'Views', 'Times your posts were seen', current, previous, (week) => week.views),
    percentStat(
      'nonFollowerPercent',
      'Non-followers',
      "Share of views from people who don't follow you yet",
      current,
      previous,
      (week) => week.nonFollowerPercent,
    ),
    countStat(
      'interactions',
      'Interactions',
      'Actions people took on your posts',
      current,
      previous,
      (week) => week.interactions,
    ),
    countStat(
      'profileVisits',
      'Profile visits',
      'Times someone opened your profile',
      current,
      previous,
      (week) => week.profileVisits,
    ),
    countStat(
      'followersTotal',
      'Followers',
      'People following you at the end of the week',
      current,
      previous,
      (week) => week.followersTotal,
    ),
  ];
  return { current, previous, stats };
}

function comparisonLine(hasPrevious: boolean, previousMissing: boolean, sentence: string): string {
  if (!hasPrevious) return 'No earlier week to compare';
  if (previousMissing) return 'Last week is not available yet';
  return sentence;
}

function countStat(
  id: string,
  label: string,
  plain: string,
  current: Week | null,
  previous: Week | null,
  read: (week: Week) => number | null,
): Stat {
  const value = current ? read(current) : null;
  if (!isNumber(value)) return { id, label, plain, value: null, change: null };
  const prior = previous ? read(previous) : null;
  let sentence = 'Same as last week';
  if (isNumber(prior)) {
    const delta = value - prior;
    if (delta > 0) sentence = `${formatCount(delta)} more than last week`;
    else if (delta < 0) sentence = `${formatCount(Math.abs(delta))} fewer than last week`;
  }
  return {
    id,
    label,
    plain,
    value: formatCount(value),
    change: comparisonLine(previous !== null, !isNumber(prior), sentence),
  };
}

function percentStat(
  id: string,
  label: string,
  plain: string,
  current: Week | null,
  previous: Week | null,
  read: (week: Week) => number | null,
): Stat {
  const value = current ? read(current) : null;
  if (!isNumber(value)) return { id, label, plain, value: null, change: null };
  const prior = previous ? read(previous) : null;
  let sentence = 'Same as last week';
  if (isNumber(prior)) {
    const shownDelta = roundTo(value * 100, 1) - roundTo(prior * 100, 1);
    const points = roundTo(Math.abs(shownDelta), 1);
    if (points === 1) {
      sentence = shownDelta > 0 ? '1 point higher than last week' : '1 point lower than last week';
    } else if (points > 0) {
      const amount = formatOneDecimal(points);
      sentence = shownDelta > 0 ? `${amount} points higher than last week` : `${amount} points lower than last week`;
    }
  }
  return {
    id,
    label,
    plain,
    value: formatPercentFromFraction(value),
    change: comparisonLine(previous !== null, !isNumber(prior), sentence),
  };
}

export type TrendKind = 'count' | 'percent' | 'followers';

export type TrendPoint = {
  week: string;
  weekStart: string;
  label: string;
  value: number | null;
};

export type Trend = {
  id: string;
  title: string;
  plain: string;
  kind: TrendKind;
  points: TrendPoint[];
};

export function trends(data: Analytics): Trend[] {
  const weeks = weeksInOrder(data);
  const build = (
    id: string,
    title: string,
    plain: string,
    kind: TrendKind,
    read: (week: Week) => number | null,
  ): Trend => ({
    id,
    title,
    plain,
    kind,
    points: weeks.map((week) => ({
      week: week.week,
      weekStart: week.weekStart,
      label: formatShortDate(week.weekStart),
      value: read(week),
    })),
  });

  return [
    build('views', 'Views', 'Times your posts were seen', 'count', (week) => week.views),
    build(
      'followersTotal',
      'Followers',
      'People following you at the end of each week. The scale is zoomed in, so a few new followers are easy to see. It starts near your current total, not at zero.',
      'followers',
      (week) => week.followersTotal,
    ),
    build(
      'nonFollowerPercent',
      'Non-followers',
      "Share of views from people who don't follow you yet. The scale runs from 0% to 100%.",
      'percent',
      (week) => week.nonFollowerPercent,
    ),
    build(
      'interactions',
      'Interactions',
      'Actions people took on your posts',
      'count',
      (week) => week.interactions,
    ),
    build(
      'profileVisits',
      'Profile visits',
      'Times someone opened your profile',
      'count',
      (week) => week.profileVisits,
    ),
  ];
}

export function followerDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(2, Math.ceil((max - min) * 0.45));
  return [Math.max(0, min - pad), max + pad];
}

/** A ratio only when every input exists. Zero is a real zero. Dividing by zero stays unavailable. */
export function perThousand(part: number | null, whole: number | null): number | null {
  if (!isNumber(part) || !isNumber(whole) || whole === 0) return null;
  return (part / whole) * 1000;
}

export function postRatio(post: Post, key: RatioKey): number | null {
  switch (key) {
    case 'sharesPer1000Views':
      return perThousand(post.shares, post.views);
    case 'savesPer1000Views':
      return perThousand(post.saves, post.views);
    case 'followsPer1000NonFollowerViews': {
      if (!isNumber(post.views) || !isNumber(post.nonFollowerPercent) || !isNumber(post.follows)) {
        return null;
      }
      const nonFollowerViews = post.views * post.nonFollowerPercent;
      return perThousand(post.follows, nonFollowerViews);
    }
    case 'retention3s':
      return isNumber(post.retention3s) ? post.retention3s * 100 : null;
  }
}

export function bandFor(value: number, rule: Pick<RatioConfig, 'watchMin' | 'watchMax'>): Band {
  const shown = roundTo(value, 1);
  if (shown < rule.watchMin) return 'weak';
  if (shown > rule.watchMax) return 'good';
  return 'watch';
}

export type RatedValue = {
  value: number | null;
  shown: string | null;
  band: Band | null;
  bandText: string | null;
};

export function rateRatio(post: Post, key: RatioKey): RatedValue {
  const rule = ratioByKey(key);
  const value = postRatio(post, key);
  if (!isNumber(value)) {
    return { value: null, shown: null, band: null, bandText: null };
  }
  const band = bandFor(value, rule);
  const shown = rule.unit === 'percent' ? formatPercentValue(value) : formatOneDecimal(value);
  return { value, shown, band, bandText: bandLabel[band] };
}

export type SortKey =
  | 'date'
  | 'title'
  | 'format'
  | 'pillar'
  | 'views'
  | 'shares'
  | 'saves'
  | RatioKey;

export type SortDirection = 'asc' | 'desc';

export function defaultDirection(key: SortKey): SortDirection {
  if (key === 'title' || key === 'format' || key === 'pillar') return 'asc';
  return 'desc';
}

export function sortValue(post: Post, key: SortKey): string | number | null {
  switch (key) {
    case 'date':
      return post.date;
    case 'title':
      return post.title;
    case 'format':
      return post.format;
    case 'pillar':
      return post.pillar;
    case 'views':
      return post.views;
    case 'shares':
      return post.shares;
    case 'saves':
      return post.saves;
    default:
      return postRatio(post, key);
  }
}

export function sortPosts(posts: Post[], key: SortKey, direction: SortDirection): Post[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...posts].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    const leftMissing = left === null || left === undefined || left === '';
    const rightMissing = right === null || right === undefined || right === '';
    if (leftMissing && rightMissing) return compareDate(a, b);
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    if (typeof left === 'number' && typeof right === 'number') {
      if (left === right) return compareDate(a, b);
      return (left - right) * factor;
    }
    const text = String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    if (text === 0) return compareDate(a, b);
    return text * factor;
  });
}

function compareDate(a: Post, b: Post): number {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
}

export function uniqueOptions(posts: Post[], field: 'format' | 'pillar'): string[] {
  const values = new Set<string>();
  for (const post of posts) {
    const value = post[field];
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function hasUnset(posts: Post[], field: 'format' | 'pillar'): boolean {
  return posts.some((post) => !post[field]);
}

export type FormatProgress = {
  format: string;
  count: number;
  needed: number;
  ready: boolean;
  remaining: number;
};

export type JudgingStatus = {
  formats: FormatProgress[];
  unsetFormat: number;
  unsetPillar: number;
  weeks: number;
  weeksNeeded: number;
  weeksRemaining: number;
  pillarsReady: boolean;
};

export function judgingStatus(data: Analytics): JudgingStatus {
  const posts = postsInScope(data);
  const counts = new Map<string, number>();
  let unsetFormat = 0;
  let unsetPillar = 0;
  for (const post of posts) {
    if (post.format) counts.set(post.format, (counts.get(post.format) ?? 0) + 1);
    else unsetFormat += 1;
    if (!post.pillar) unsetPillar += 1;
  }
  const needed = judgingRules.postsPerFormat;
  const formats = [...counts.entries()]
    .map(([format, count]) => ({
      format,
      count,
      needed,
      ready: count >= needed,
      remaining: Math.max(0, needed - count),
    }))
    .sort((a, b) => a.format.localeCompare(b.format));
  const weeks = weeksInOrder(data).length;
  const weeksNeeded = judgingRules.weeksForPillars;
  return {
    formats,
    unsetFormat,
    unsetPillar,
    weeks,
    weeksNeeded,
    weeksRemaining: Math.max(0, weeksNeeded - weeks),
    pillarsReady: weeks >= weeksNeeded,
  };
}

export function thresholdPhrase(rule: RatioConfig): string {
  const min = rule.unit === 'percent' ? `${rule.watchMin}%` : String(rule.watchMin);
  const max = rule.unit === 'percent' ? `${rule.watchMax}%` : String(rule.watchMax);
  return `Under ${min} is weak, ${min} to ${max} is watch, over ${max} is good.`;
}

export function postsForRatio(posts: Post[], key: RatioKey): Post[] {
  return [...posts]
    .filter((post) => isNumber(postRatio(post, key)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
