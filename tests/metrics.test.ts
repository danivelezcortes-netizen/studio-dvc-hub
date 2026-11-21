import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { passwordsMatch, signSession } from '@/lib/auth';
import { csvNumber, parseCsv } from '@/lib/csv';
import { formatPosted, slotForMinutes } from '@/lib/format';
import { loadFixture } from '@/lib/fixture';
import {
  followsPerThousandNonFollowers,
  perThousand,
  placementLabel,
  retentionPercent,
  toPostView,
} from '@/lib/metrics';
import { redact } from '@/lib/redact';
import type { Analysis, RawPost } from '@/lib/types';

const analysis = JSON.parse(readFileSync(path.join(process.cwd(), 'data/analysis.json'), 'utf8')) as Analysis;

describe('ratios', () => {
  it('keeps a real zero and leaves a missing input empty', () => {
    expect(perThousand(0, 599)).toBe(0);
    expect(perThousand(null, 599)).toBeNull();
    expect(perThousand(2, 0)).toBeNull();
    expect(perThousand(2, 599)).toBe(3.3);
    expect(perThousand(8, 2068)).toBe(3.9);
  });

  it('turns skip rate into 3-second retention', () => {
    expect(retentionPercent(57.3)).toBe(42.7);
    expect(retentionPercent(0.573)).toBe(42.7);
    expect(retentionPercent(28.9)).toBe(71.1);
    expect(retentionPercent(null)).toBeNull();
  });

  it('computes follows per 1,000 non-follower views only when every input exists', () => {
    expect(followsPerThousandNonFollowers(1, 2068, 0.986)).toBe(0.5);
    expect(followsPerThousandNonFollowers(null, 2068, 0.986)).toBeNull();
    expect(followsPerThousandNonFollowers(0, 599, 0.927)).toBe(0);
  });
});

describe('paris time and labels', () => {
  it('formats the approved Tuesday reel in Paris time', () => {
    const posted = formatPosted(new Date('2026-11-03T18:20:00+01:00'));
    expect(posted.postedLabel).toBe('martes 3 nov, 18:20');
    expect(posted.weekdayIndex).toBe(1);
    expect(slotForMinutes(posted.minutes).id).toBe('noche');
  });

  it('keeps a graduated trial separate from a current trial', () => {
    expect(placementLabel({ placement: 'grid', wasTrial: true, kind: 'Reel' })).toBe('Grid (fue trial)');
    expect(placementLabel({ placement: 'not_on_grid', wasTrial: false, kind: 'Reel' })).toBe('Trial (no en el grid)');
    expect(placementLabel({ placement: 'grid', wasTrial: false, kind: 'Carrusel' })).toBe('Grid (carrusel)');
  });
});

describe('fixture', () => {
  const data = loadFixture(analysis);

  it('keeps the 15 posts since the relaunch and the manual follows', () => {
    expect(data.posts).toHaveLength(15);
    expect(data.posts.some((post) => post.date < '2026-10-29')).toBe(false);
    const trial = data.posts.find((post) => post.id === '18116247323116095');
    expect(trial).toMatchObject({
      postedLabel: 'martes 3 nov, 18:20',
      placementLabel: 'Grid (fue trial)',
      views: 2068,
      retention: 71.1,
      sharesPer1k: 0.5,
      savesPer1k: 3.9,
      follows: 1,
      followsPer1kNf: 0.5,
    });
    const charm = data.posts.find((post) => post.id === '18137485312578652');
    expect(charm?.follows).toBeNull();
    expect(charm?.followsPer1kNf).toBeNull();
    expect(charm?.placementLabel).toBe('Trial (no en el grid)');
  });

  it('does not treat a blank CSV cell as zero', () => {
    const csv = parseCsv(readFileSync(path.join(process.cwd(), 'data/fixtures/posts_latest.csv'), 'utf8'));
    expect(csvNumber(csv[0].follows)).toBeNull();
    expect(csvNumber(csv[0].views)).toBe(599);
  });
});

describe('secrets', () => {
  it('strips the token from errors', () => {
    const secret = 'IGQVJ-secret-token';
    expect(redact(`failed ${secret} access_token=${secret}&foo=1`, secret)).not.toContain(secret);
  });

  it('accepts only the real password', async () => {
    expect(passwordsMatch('studio', 'studio')).toBe(true);
    expect(passwordsMatch('studio', 'studio ')).toBe(false);
    const token = await signSession('studio');
    expect(passwordsMatch(token, await signSession('studio'))).toBe(true);
    expect(passwordsMatch(token, await signSession('otra'))).toBe(false);
  });
});

describe('missing post inputs', () => {
  it('leaves retention empty for a carousel and does not invent follows', () => {
    const raw: RawPost = {
      id: '1',
      permalink: 'https://instagram.com/p/abc',
      caption: 'Hola',
      timestamp: '2026-11-01T20:05:00+01:00',
      date: '2026-11-01',
      mediaType: 'CAROUSEL_ALBUM',
      productType: 'FEED',
      views: 10,
      reach: 4,
      saves: null,
      shares: 0,
      likes: 1,
      comments: 0,
      skipRate: 10,
      avgWatchMs: null,
      isSharedToFeed: null,
      placement: 'grid',
      thumbnailUrl: null,
    };
    const post = toPostView(raw, undefined);
    expect(post?.retention).toBeNull();
    expect(post?.follows).toBeNull();
    expect(post?.sharesPer1k).toBe(0);
    expect(post?.savesPer1k).toBeNull();
  });
});
