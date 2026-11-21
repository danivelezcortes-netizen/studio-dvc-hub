import { judgingRules } from '../../config/rules';
import type { JudgingStatus } from '../../lib/metrics';

export function JudgingRules({ status }: { status: JudgingStatus }) {
  return (
    <section className="block rules" aria-labelledby="rules-title">
      <h3 id="rules-title">Judging rules</h3>
      <p>
        A format is ready to judge after {judgingRules.postsPerFormat} posts in that format, so one strong post does not decide it.
      </p>
      <p>A pillar is ready to judge after {judgingRules.weeksForPillars} weeks. A theme needs time.</p>
      <p>Trial Reels stay separate from Reels. They are counted on their own.</p>

      <div className="meters">
        {status.formats.map((item) => (
          <div key={item.format} className="meter-row">
            <div className="meter-top">
              <strong>{item.format}</strong>
              <span>
                {item.count} of {item.needed} posts
              </span>
            </div>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (item.count / item.needed) * 100)}%` }} />
            </div>
            <p className="quiet">{item.ready ? 'Ready to judge' : remainingPosts(item.remaining)}</p>
          </div>
        ))}
        <div className="meter-row">
          <div className="meter-top">
            <strong>Weeks, for pillars</strong>
            <span>
              {status.weeks} of {status.weeksNeeded} weeks
            </span>
          </div>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (status.weeks / status.weeksNeeded) * 100)}%` }} />
          </div>
          <p className="quiet">
            {status.pillarsReady ? 'Ready to judge pillars' : remainingWeeks(status.weeksRemaining)}
          </p>
        </div>
      </div>

      {status.unsetFormat > 0 ? (
        <p className="quiet">
          {status.unsetFormat === 1
            ? '1 post still needs a format, so it is not in the counts above.'
            : `${status.unsetFormat} posts still need a format, so they are not in the counts above.`}
        </p>
      ) : null}
      {status.unsetPillar > 0 ? (
        <p className="quiet">
          {status.unsetPillar === 1
            ? '1 post still needs a pillar. Pillars are judged by how many weeks have passed, not by a post count.'
            : `${status.unsetPillar} posts still need a pillar. Pillars are judged by how many weeks have passed, not by a post count.`}
        </p>
      ) : null}
    </section>
  );
}

function remainingPosts(count: number): string {
  if (count === 1) return '1 more post before a judgment is fair';
  return `${count} more posts before a judgment is fair`;
}

function remainingWeeks(count: number): string {
  if (count === 1) return '1 more week before pillars can be judged';
  return `${count} more weeks before pillars can be judged`;
}
