import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Band } from '../../components/Band';
import { ratios, type Band as BandName, type RatioKey } from '../../config/thresholds';
import { formatShortDate, isNumber, postsForRatio, rateRatio, type RatedValue } from '../../lib/metrics';
import type { Post } from '../../types';

const barColor: Record<BandName, string> = {
  weak: '#C9A59B',
  watch: '#D2BE96',
  good: '#2F4A3A',
};

const chartKeys: RatioKey[] = ['savesPer1000Views', 'sharesPer1000Views'];

type BarRow = {
  key: string;
  title: string;
  axis: string;
  value: number;
  rated: RatedValue;
};

export function RatioCharts({ posts }: { posts: Post[] }) {
  const charts = chartKeys
    .map((key) => ratios.find((ratio) => ratio.key === key))
    .filter((ratio) => ratio !== undefined);

  return (
    <div className="ratio-block">
      <h4>Saves and shares, post by post</h4>
      <p className="quiet">Each bar is one post. Posts still missing this number are left off the chart.</p>
      <div className="ratio-grid">
        {charts.map((rule) => (
          <RatioChart key={rule.key} ruleKey={rule.key} title={rule.title} plain={rule.plain} posts={posts} />
        ))}
      </div>
    </div>
  );
}

function RatioChart({
  ruleKey,
  title,
  plain,
  posts,
}: {
  ruleKey: RatioKey;
  title: string;
  plain: string;
  posts: Post[];
}) {
  const rows: BarRow[] = postsForRatio(posts, ruleKey).flatMap((post) => {
    const rated = rateRatio(post, ruleKey);
    if (!isNumber(rated.value) || !rated.shown || !rated.band || !rated.bandText) return [];
    const short = post.title.length > 22 ? `${post.title.slice(0, 20)}…` : post.title;
    return [
      {
        key: `${post.date}-${post.title}`,
        title: post.title,
        axis: `${formatShortDate(post.date)}|${short}`,
        value: rated.value,
        rated,
      },
    ];
  });
  const peak = Math.max(...rows.map((row) => row.value), 0);

  return (
    <article className="chart-card">
      <h4>{title}</h4>
      <p className="quiet">{plain}</p>
      {rows.length === 0 ? (
        <p className="chart-empty">Nothing to chart yet.</p>
      ) : (
        <>
          <ol className="ratio-rows">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="ratio-row-name">
                  <span>{row.axis.split('|')[0]}</span>
                  <strong>{row.title}</strong>
                </div>
                <div className="ratio-row-score">
                  <span>{row.rated.shown}</span>
                  {row.rated.band ? <Band band={row.rated.band} /> : null}
                </div>
                <div className="ratio-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${peak <= 0 ? 0 : (row.value / peak) * 100}%`,
                      background: row.rated.band ? barColor[row.rated.band] : '#E6DDD2',
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div className="chart-scroll">
            <div className="chart-plot bar-plot" style={{ height: Math.max(220, rows.length * 72 + 8) }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 112, bottom: 8, left: 4 }}>
                  <XAxis type="number" hide domain={[0, peak <= 0 ? 1 : peak]} />
                  <YAxis
                    type="category"
                    dataKey="axis"
                    width={188}
                    interval={0}
                    tick={AxisTick}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<RatioTooltip />} cursor={{ fill: '#F6F0E8' }} />
                  <Bar dataKey="value" barSize={14} radius={[0, 7, 7, 0]} isAnimationActive={false} label={barLabel(rows)}>
                    {rows.map((row) => (
                      <Cell key={row.key} fill={row.rated.band ? barColor[row.rated.band] : '#E6DDD2'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="sr-only">
              {rows.map((row) => (
                <li key={row.key}>
                  {row.title}: {row.rated.shown}, {row.rated.bandText}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </article>
  );
}

function AxisTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const [date = '', title = ''] = String(payload?.value ?? '').split('|');
  return (
    <text x={x} y={y} textAnchor="end" fill="#3E4A43" fontSize={12} fontFamily="Outfit, sans-serif">
      <tspan x={x} dy="-7">
        {date}
      </tspan>
      <tspan x={x} dy="15">
        {title}
      </tspan>
    </text>
  );
}

function barLabel(rows: BarRow[]) {
  return function Label(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) {
    const row = rows[props.index ?? -1];
    if (!row?.rated.shown || !row.rated.bandText) return <text />;
    const x = (props.x ?? 0) + (props.width ?? 0) + 8;
    const y = (props.y ?? 0) + (props.height ?? 0) / 2;
    return (
      <text x={x} y={y} dominantBaseline="central" fill="#1C2822" fontSize={12} fontFamily="Outfit, sans-serif">
        {row.rated.shown} · {row.rated.bandText}
      </text>
    );
  };
}

function RatioTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BarRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tip">
      <p>{row.title}</p>
      <strong>
        {row.rated.shown} {row.rated.band ? <Band band={row.rated.band} /> : null}
      </strong>
    </div>
  );
}
