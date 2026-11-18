export type Week = {
  week: string;
  weekStart: string;
  views: number | null;
  reach: number | null;
  nonFollowerPercent: number | null;
  interactions: number | null;
  profileVisits: number | null;
  followersTotal: number | null;
  follows: number | null;
  shares: number | null;
  saves: number | null;
  bestPost: string | null;
  testing: string | null;
  recommendations: string | null;
};

export type Post = {
  title: string;
  date: string;
  format: string | null;
  pillar: string | null;
  views: number | null;
  nonFollowerPercent: number | null;
  shares: number | null;
  saves: number | null;
  follows: number | null;
  retention3s: number | null;
  postLink: string | null;
  note?: string | null;
};

export type Analytics = {
  generatedAt: string;
  account: string;
  baselineStart: string;
  weeks: Week[];
  posts: Post[];
};
