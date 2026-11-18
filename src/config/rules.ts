/**
 * How much history we want before a judgment is fair.
 * The Judging rules box reads these numbers.
 */
export const judgingRules = {
  /** Posts of one format before that format can be judged. Trial Reel is its own format. */
  postsPerFormat: 6,
  /** Weeks on record before pillars can be judged. */
  weeksForPillars: 4,
} as const;
