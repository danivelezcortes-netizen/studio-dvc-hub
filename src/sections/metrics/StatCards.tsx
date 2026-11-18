import { Missing } from '../../components/Missing';
import type { Stat } from '../../lib/metrics';

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <section className="stat-grid" aria-label="This week">
      {stats.map((stat) => (
        <article key={stat.id} className="stat">
          <p className="stat-label">{stat.label}</p>
          <p className="stat-value">{stat.value === null ? <Missing /> : stat.value}</p>
          <p className="stat-plain">{stat.plain}</p>
          {stat.change ? <p className="stat-change">{stat.change}</p> : null}
        </article>
      ))}
    </section>
  );
}
