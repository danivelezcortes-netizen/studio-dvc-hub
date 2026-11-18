/**
 * Starting thresholds for reading a post.
 * Edit the numbers here. Labels on the page, and the guide under the table, follow this file.
 *
 * Weak is under watchMin.
 * Watch is from watchMin through watchMax, including both ends.
 * Good is over watchMax.
 *
 * per1000 numbers are "per 1,000 views" (or per 1,000 non-follower views).
 * percent numbers are on a 0–100 scale. 3-second retention is stored in the
 * weekly file as a 0–1 fraction and turned into a percent before this check.
 */
export type Band = 'weak' | 'watch' | 'good';

export type RatioKey =
  | 'sharesPer1000Views'
  | 'savesPer1000Views'
  | 'followsPer1000NonFollowerViews'
  | 'retention3s';

export type RatioUnit = 'per1000' | 'percent';

export type RatioConfig = {
  key: RatioKey;
  title: string;
  plain: string;
  unit: RatioUnit;
  watchMin: number;
  watchMax: number;
};

export const ratios: RatioConfig[] = [
  {
    key: 'sharesPer1000Views',
    title: 'Shares per 1,000 views',
    plain: 'How often people send this to someone',
    unit: 'per1000',
    watchMin: 1,
    watchMax: 5,
  },
  {
    key: 'savesPer1000Views',
    title: 'Saves per 1,000 views',
    plain: 'How often people keep this for later',
    unit: 'per1000',
    watchMin: 2,
    watchMax: 5,
  },
  {
    key: 'followsPer1000NonFollowerViews',
    title: 'Follows per 1,000 non-follower views',
    plain: "How often a person who doesn't follow you yet chooses to follow",
    unit: 'per1000',
    watchMin: 1,
    watchMax: 3,
  },
  {
    key: 'retention3s',
    title: '3-second retention',
    plain: 'How many people stay past the first 3 seconds',
    unit: 'percent',
    watchMin: 50,
    watchMax: 65,
  },
];

export const bandLabel: Record<Band, string> = {
  weak: 'Weak',
  watch: 'Watch',
  good: 'Good',
};

export const bandPlain: Record<Band, string> = {
  weak: 'Below the starting line',
  watch: 'In the middle. Keep an eye on it',
  good: 'Above the starting line',
};

export const startingThresholdNote =
  'These are starting thresholds. They are a first guide, not a final verdict.';

export function ratioByKey(key: RatioKey): RatioConfig {
  const found = ratios.find((ratio) => ratio.key === key);
  if (!found) {
    throw new Error(`Missing ratio config for ${key}`);
  }
  return found;
}
