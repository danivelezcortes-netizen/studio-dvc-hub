import { describe, expect, it } from 'vitest';
import { judgingRules } from '../config/rules';
import { ratios } from '../config/thresholds';
import { analytics } from '../data';
import type { Analytics, Post } from '../types';
import {
  bandFor,
  judgingStatus,
  latestSummary,
  perThousand,
  postsInScope,
  rateRatio,
  sortPosts,
  thresholdPhrase,
  weeksInOrder,
} from './metrics';

const byTitle = (title: string): Post => {
  const post = analytics.posts.find((item) => item.title === title);
  if (!post) throw new Error(`Missing post ${title}`);
  return post;
};

describe('seed file', () => {
  it('keeps the account, the baseline, and every seeded post', () => {
    expect(analytics.generatedAt).toBe('2026-11-18T15:24:57+01:00');
    expect(analytics.account).toBe('@studio.dvc');
    expect(analytics.baselineStart).toBe('2026-10-29');
    expect(analytics.weeks).toHaveLength(3);
    expect(analytics.posts.map((post) => post.title)).toEqual([
      'Orchid reel',
      "Orchids don't last (carousel)",
      "Some things don't last forever (orchids)",
      'Kinda chic (orchid necklace process)',
      'This and no stress (4 tiny habits)',
    ]);
    expect(byTitle('This and no stress (4 tiny habits)').views).toBeNull();
    expect(byTitle("Some things don't last forever (orchids)").format).toBe('Trial Reel');
  });
});

describe('latest week', () => {
  it('compares week 3 with week 2 and leaves real zeros as zeros', () => {
    const { current, stats } = latestSummary(analytics);
    expect(current?.week).toBe('Week 3 · Nov 9 to Nov 15');
    expect(stats.map((stat) => [stat.id, stat.value, stat.change])).toEqual([
      ['views', '2,435', '1,361 fewer than last week'],
      ['nonFollowerPercent', '89.8%', '1.1 points higher than last week'],
      ['interactions', '102', '52 fewer than last week'],
      ['profileVisits', '16', '24 fewer than last week'],
      ['followersTotal', '267', '5 more than last week'],
    ]);
  });

  it('does not invent a change when a week is missing the number', () => {
    const blank = {
      ...analytics,
      weeks: [
        { ...analytics.weeks[0], weekStart: '2026-11-01', views: null },
        { ...analytics.weeks[1], weekStart: '2026-11-08', views: 10 },
      ],
    } satisfies Analytics;
    const views = latestSummary(blank).stats.find((stat) => stat.id === 'views');
    expect(views).toMatchObject({ value: '10', change: 'Last week is not available yet' });

    const only = { ...analytics, weeks: [{ ...analytics.weeks[2], views: null }] } satisfies Analytics;
    const missing = latestSummary(only).stats.find((stat) => stat.id === 'views');
    expect(missing).toMatchObject({ value: null, change: null });
  });
});

describe('post ratios', () => {
  it('calculates ratios only when every input exists', () => {
    expect(perThousand(null, 10)).toBeNull();
    expect(perThousand(2, null)).toBeNull();
    expect(perThousand(2, 0)).toBeNull();
    expect(perThousand(0, 10)).toBe(0);

    const orchid = byTitle('Orchid reel');
    expect(rateRatio(orchid, 'sharesPer1000Views')).toMatchObject({ shown: '0', band: 'weak' });
    expect(rateRatio(orchid, 'savesPer1000Views')).toMatchObject({ shown: '3.5', band: 'watch' });
    expect(rateRatio(orchid, 'followsPer1000NonFollowerViews')).toMatchObject({ shown: '0', band: 'weak' });
    expect(rateRatio(orchid, 'retention3s').shown).toBeNull();

    const carousel = byTitle("Orchids don't last (carousel)");
    expect(rateRatio(carousel, 'savesPer1000Views')).toMatchObject({ shown: '0', band: 'weak' });

    const trial = byTitle("Some things don't last forever (orchids)");
    expect(rateRatio(trial, 'savesPer1000Views')).toMatchObject({ shown: '4.1', band: 'watch' });
    expect(rateRatio(trial, 'followsPer1000NonFollowerViews')).toMatchObject({ shown: '0.5', band: 'weak' });

    const chic = byTitle('Kinda chic (orchid necklace process)');
    expect(rateRatio(chic, 'savesPer1000Views')).toMatchObject({ shown: '3.1', band: 'watch' });
    expect(rateRatio(chic, 'followsPer1000NonFollowerViews')).toMatchObject({ shown: '0.6', band: 'weak' });

    const pending = byTitle('This and no stress (4 tiny habits)');
    for (const ratio of ratios) {
      expect(rateRatio(pending, ratio.key).shown).toBeNull();
    }
  });

  it('reads 3-second retention as a fraction from 0 to 1', () => {
    const post = { ...byTitle('Orchid reel'), retention3s: 0.62 };
    expect(rateRatio(post, 'retention3s')).toMatchObject({ shown: '62%', band: 'watch' });
  });

  it('labels the rounded number, using the starting thresholds', () => {
    const shares = ratios[0];
    expect(bandFor(0.94, shares)).toBe('weak');
    expect(bandFor(0.96, shares)).toBe('watch');
    expect(bandFor(1, shares)).toBe('watch');
    expect(bandFor(5, shares)).toBe('watch');
    expect(bandFor(5.04, shares)).toBe('watch');
    expect(bandFor(5.06, shares)).toBe('good');

    const saves = ratios[1];
    expect(bandFor(1.94, saves)).toBe('weak');
    expect(bandFor(1.96, saves)).toBe('watch');
    expect(bandFor(2, saves)).toBe('watch');
    expect(bandFor(5, saves)).toBe('watch');
    expect(bandFor(5.06, saves)).toBe('good');

    const follows = ratios[2];
    expect(bandFor(0.94, follows)).toBe('weak');
    expect(bandFor(1, follows)).toBe('watch');
    expect(bandFor(3, follows)).toBe('watch');
    expect(bandFor(3.06, follows)).toBe('good');

    const retention = ratios[3];
    expect(bandFor(49.94, retention)).toBe('weak');
    expect(bandFor(50, retention)).toBe('watch');
    expect(bandFor(65, retention)).toBe('watch');
    expect(bandFor(65.06, retention)).toBe('good');
    expect(thresholdPhrase(retention)).toBe('Under 50% is weak, 50% to 65% is watch, over 65% is good.');
  });

  it('sorts missing numbers after real zeros', () => {
    const sorted = sortPosts(postsInScope(analytics), 'views', 'desc');
    expect(sorted.map((post) => post.views)).toEqual([1937, 1591, 577, 267, null]);
    const byShares = sortPosts(postsInScope(analytics), 'shares', 'desc');
    expect(byShares.at(-1)?.title).toBe('This and no stress (4 tiny habits)');
    expect(byShares.slice(0, 4).every((post) => post.shares === 0)).toBe(true);
  });
});

describe('what counts', () => {
  it('starts at the baseline and keeps Trial Reel separate from Reel', () => {
    expect(postsInScope(analytics)).toHaveLength(5);
    const older: Post = { ...byTitle('Orchid reel'), title: 'Before', date: '2026-10-28' };
    const withOlder = { ...analytics, posts: [...analytics.posts, older] };
    expect(postsInScope(withOlder).some((post) => post.title === 'Before')).toBe(false);

    const status = judgingStatus(analytics);
    expect(status.formats.map((item) => [item.format, item.count, item.needed])).toEqual([
      ['Carousel', 1, judgingRules.postsPerFormat],
      ['Reel', 2, judgingRules.postsPerFormat],
      ['Trial Reel', 1, judgingRules.postsPerFormat],
    ]);
    expect(status.unsetFormat).toBe(1);
    expect(status.unsetPillar).toBe(2);
    expect(status.weeks).toBe(3);
    expect(status.weeksNeeded).toBe(judgingRules.weeksForPillars);
    expect(status.pillarsReady).toBe(false);
    expect(status.formats.every((item) => item.ready === false)).toBe(true);
  });

  it('ignores weeks and posts from before the baseline', () => {
    const later = { ...analytics, baselineStart: '2026-11-09' };
    expect(weeksInOrder(later).map((week) => week.weekStart)).toEqual(['2026-11-09']);
    expect(postsInScope(later).map((post) => post.date)).toEqual(['2026-11-10']);
    expect(judgingStatus(later).weeks).toBe(1);
  });
});
