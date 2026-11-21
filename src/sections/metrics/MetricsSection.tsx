import { analytics } from '../../data';
import {
  formatLongDate,
  judgingStatus,
  latestSummary,
  postsInScope,
  trends,
  weeksInOrder,
} from '../../lib/metrics';
import { JudgingRules } from './JudgingRules';
import { LearningPanel } from './LearningPanel';
import { PostTable } from './PostTable';
import { StatCards } from './StatCards';
import { TrendCharts } from './TrendCharts';

export function MetricsSection() {
  const { current, previous, stats } = latestSummary(analytics);
  const posts = postsInScope(analytics);
  const series = trends(analytics);
  const weeks = [...weeksInOrder(analytics)].reverse();

  return (
    <div className="page">
      <header className="masthead">
        <p className="kicker">This week</p>
        <h2 className="page-title">{current ? current.week : 'No weeks yet'}</h2>
        <p className="lede">
          {current && previous
            ? `Compared with ${previous.week}.`
            : current
              ? 'There is no earlier week to compare yet.'
              : 'When a week is added, it will appear here.'}
        </p>
      </header>
      <StatCards stats={stats} />
      <TrendCharts series={series} />
      <PostTable
        posts={posts}
        baselineLabel={formatLongDate(analytics.baselineStart)}
        excluded={analytics.posts.length - posts.length}
      />
      <LearningPanel weeks={weeks} />
      <JudgingRules status={judgingStatus(analytics)} />
    </div>
  );
}
