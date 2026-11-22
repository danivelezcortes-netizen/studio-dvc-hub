import { formatPosted, slotForMinutes, weekdayOrder } from './format';
import type { ManualPost, Placement, PostKind, PostView, RawPost, TimingRow } from './types';

const BASELINE = '2026-10-29';

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function perThousand(part: number | null, whole: number | null): number | null {
  if (!isNumber(part) || !isNumber(whole) || whole === 0) return null;
  return Math.round((part / whole) * 1000 * 10) / 10;
}

/** Skip rate may arrive as 57.3 (%) or 0.573 (fraction). Retention is a percent. */
export function retentionPercent(skipRate: number | null): number | null {
  if (!isNumber(skipRate) || skipRate < 0) return null;
  const skipPercent = skipRate > 1 ? skipRate : skipRate * 100;
  const retention = 100 - skipPercent;
  if (retention < 0 || retention > 100) return null;
  return Math.round(retention * 10) / 10;
}

/** Accept 0.927 or 92.7. Return a 0–1 fraction. */
export function asFraction(value: number | null | undefined): number | null {
  if (!isNumber(value) || value < 0 || value > 100) return null;
  if (value > 1) return value / 100;
  return value;
}

export function followsPerThousandNonFollowers(
  follows: number | null,
  views: number | null,
  nonFollowerFraction: number | null,
): number | null {
  if (!isNumber(follows) || !isNumber(views) || !isNumber(nonFollowerFraction)) return null;
  return perThousand(follows, views * nonFollowerFraction);
}

export function postKind(mediaType: string | null, productType: string | null): PostKind {
  const type = (mediaType || '').toUpperCase();
  const product = (productType || '').toUpperCase();
  if (type === 'CAROUSEL_ALBUM') return 'Carrusel';
  if (product === 'REELS' || type === 'VIDEO') return 'Reel';
  return 'Publicación';
}

export function derivePlacement(post: {
  mediaType: string | null;
  productType: string | null;
  isSharedToFeed: boolean | null;
  placement: Placement | null;
}): Placement | null {
  const product = (post.productType || '').toUpperCase();
  const mediaType = (post.mediaType || '').toUpperCase();
  if (product === 'FEED' || mediaType === 'CAROUSEL_ALBUM') return 'grid';
  if (product === 'REELS' || mediaType === 'VIDEO') {
    if (post.isSharedToFeed === true) return 'grid';
    if (post.isSharedToFeed === false) return 'not_on_grid';
    return post.placement;
  }
  return post.placement;
}

export function placementLabel(post: {
  placement: Placement | null;
  wasTrial: boolean;
  kind: PostKind;
}): string {
  if (post.placement === 'grid' && post.wasTrial) return 'Grid (fue trial)';
  if (post.placement === 'grid' && post.kind === 'Carrusel') return 'Grid (carrusel)';
  if (post.placement === 'grid') return 'Grid';
  if (post.placement === 'not_on_grid') return 'Trial (no en el grid)';
  return 'Sin etiqueta';
}

export function captionHook(caption: string): string {
  const line = caption.split(/\n/)[0]?.trim() ?? '';
  const clean = line.replace(/\s+/g, ' ');
  if (clean.length <= 140) return clean;
  return `${clean.slice(0, 139).trimEnd()}…`;
}

export function inBaseline(date: string | null): boolean {
  return Boolean(date && date >= BASELINE);
}

export function toPostView(raw: RawPost, manual: ManualPost | undefined): PostView | null {
  const when = raw.timestamp ? new Date(raw.timestamp) : null;
  const validWhen = when && !Number.isNaN(when.getTime()) ? when : null;
  const posted = validWhen ? formatPosted(validWhen) : null;
  const date = posted?.date ?? raw.date;
  if (!inBaseline(date)) return null;

  const kind = postKind(raw.mediaType, raw.productType);
  const placement = derivePlacement(raw);
  const wasTrial = manual?.wasTrial === true;
  const slot = posted ? slotForMinutes(posted.minutes) : null;
  const follows = isNumber(manual?.follows) ? manual.follows : null;
  const fraction = asFraction(manual?.nonFollowerPercent);
  const retention = kind === 'Carrusel' ? null : retentionPercent(raw.skipRate);

  return {
    id: raw.id,
    permalink: raw.permalink,
    caption: raw.caption,
    title: manual?.title?.trim() || captionHook(raw.caption) || 'Publicación',
    alt: manual?.alt?.trim() || (posted ? `Portada del ${posted.postedLabel}.` : 'Portada de la publicación.'),
    kind,
    placement,
    placementLabel: placementLabel({ placement, wasTrial, kind }),
    wasTrial,
    date: date ?? '',
    timeParis: posted?.timeParis ?? null,
    weekday: posted?.weekday ?? null,
    weekdayIndex: posted && posted.weekdayIndex >= 0 ? posted.weekdayIndex : null,
    postedLabel: posted?.postedLabel ?? (date ?? ''),
    slot: slot?.id ?? null,
    slotLabel: slot?.label ?? null,
    views: raw.views,
    reach: raw.reach,
    retention,
    shares: raw.shares,
    saves: raw.saves,
    sharesPer1k: perThousand(raw.shares, raw.views),
    savesPer1k: perThousand(raw.saves, raw.views),
    follows,
    nonFollowerPercent: fraction == null ? null : Math.round(fraction * 1000) / 10,
    followsPer1kNf: followsPerThousandNonFollowers(follows, raw.views, fraction),
    snapshot: manual?.snapshot ?? null,
    hasThumbnail: Boolean(raw.thumbnailUrl),
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stats(posts: PostView[]): { n: number; views: number | null; retention: number | null } {
  return {
    n: posts.length,
    views: mean(posts.flatMap((post) => (isNumber(post.views) ? [post.views] : []))),
    retention: mean(posts.flatMap((post) => (isNumber(post.retention) ? [post.retention] : []))),
  };
}

export function weekdayRows(posts: PostView[]): TimingRow[] {
  return weekdayOrder().map((day) => {
    const grid = stats(posts.filter((post) => post.weekday === day && post.placement === 'grid'));
    const trial = stats(posts.filter((post) => post.weekday === day && post.placement === 'not_on_grid'));
    return {
      label: day,
      gridN: grid.n,
      gridViews: grid.views,
      gridRetention: grid.retention,
      trialN: trial.n,
      trialViews: trial.views,
      trialRetention: trial.retention,
    };
  });
}

const SLOT_LABELS: Record<string, string> = {
  mañana: 'mañana (06:00–11:59)',
  tarde: 'tarde (12:00–17:59)',
  noche: 'noche (18:00–21:59)',
  'noche tardía': 'noche tardía (22:00–05:59)',
};

export function slotRows(posts: PostView[]): TimingRow[] {
  return Object.keys(SLOT_LABELS).map((slot) => {
    const grid = stats(posts.filter((post) => post.slot === slot && post.placement === 'grid'));
    const trial = stats(posts.filter((post) => post.slot === slot && post.placement === 'not_on_grid'));
    return {
      label: SLOT_LABELS[slot],
      gridN: grid.n,
      gridViews: grid.views,
      gridRetention: grid.retention,
      trialN: trial.n,
      trialViews: trial.views,
      trialRetention: trial.retention,
    };
  });
}

export function accountNonFollowerPercent(views: number | null, nonFollowers: number | null): number | null {
  if (!isNumber(views) || !isNumber(nonFollowers) || views === 0) return null;
  return (nonFollowers / views) * 100;
}
