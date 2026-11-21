export type Placement = 'grid' | 'not_on_grid';

export type ManualPost = {
  title?: string;
  pillar?: string | null;
  wasTrial?: boolean;
  follows?: number | null;
  /** Fracción de 0 a 1, o un porcentaje de 0 a 100. */
  nonFollowerPercent?: number | null;
  snapshot?: string | null;
  alt?: string;
};

export type Analysis = {
  updatedAtLabel: string;
  followersNote: string;
  howToRead: string;
  trialExplainer: string;
  bestCaption: string;
  worstCaption: string;
  best: { mediaId: string; why: string }[];
  worst: { mediaId: string; why: string }[];
  bestMention: string;
  worstMention: string;
  scheduleIntro: string;
  scheduleNotes: string[];
  followsCaption: string;
  followsNotes: string[];
  learnings: string[];
  recommendations: string[];
  gaps: string[];
  gapsClosing: string;
  posts: Record<string, ManualPost>;
};

export type DailyFollow = {
  date: string;
  label: string;
  follows: number | null;
  unfollows: number | null;
};

export type AccountSnapshot = {
  followers: number | null;
  mediaCount: number | null;
  views: number | null;
  viewsFollowers: number | null;
  viewsNonFollowers: number | null;
  viewsUnknown: number | null;
  reach: number | null;
  follows: number | null;
  unfollows: number | null;
  shares: number | null;
  saves: number | null;
  accountsEngaged: number | null;
  interactions: number | null;
  windowLabel: string;
};

export type RawPost = {
  id: string;
  permalink: string;
  caption: string;
  timestamp: string | null;
  date: string | null;
  mediaType: string | null;
  productType: string | null;
  views: number | null;
  reach: number | null;
  saves: number | null;
  shares: number | null;
  likes: number | null;
  comments: number | null;
  skipRate: number | null;
  avgWatchMs: number | null;
  isSharedToFeed: boolean | null;
  placement: Placement | null;
  thumbnailUrl: string | null;
};

export type PostKind = 'Reel' | 'Carrusel' | 'Publicación';

export type PostView = {
  id: string;
  permalink: string;
  caption: string;
  title: string;
  alt: string;
  kind: PostKind;
  placement: Placement | null;
  placementLabel: string;
  wasTrial: boolean;
  date: string;
  timeParis: string | null;
  weekday: string | null;
  weekdayIndex: number | null;
  postedLabel: string;
  slot: string | null;
  slotLabel: string | null;
  views: number | null;
  reach: number | null;
  retention: number | null;
  shares: number | null;
  saves: number | null;
  sharesPer1k: number | null;
  savesPer1k: number | null;
  follows: number | null;
  nonFollowerPercent: number | null;
  followsPer1kNf: number | null;
  snapshot: string | null;
  hasThumbnail: boolean;
};

export type TimingRow = {
  label: string;
  gridN: number;
  gridViews: number | null;
  gridRetention: number | null;
  trialN: number;
  trialViews: number | null;
  trialRetention: number | null;
};

export type DashboardData = {
  source: 'live' | 'fixture';
  pulledAtLabel: string;
  account: AccountSnapshot;
  posts: PostView[];
  daily: DailyFollow[];
  dailyZeroDays: number | null;
  dailyMissingDays: number | null;
  analysis: Analysis;
};
