import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Missing } from '../../components/Missing';
import {
  followerDomain,
  formatCount,
  formatPercentFromFraction,
  isNumber,
  type Trend,
  type TrendPoint,
} from '../../lib/metrics';

export function TrendCharts({ series }: { series: Trend[] }) {
  return (
    <section className="block">
      <div className="block-head">
        <h3>Across the weeks</h3>
        <p className="quiet">Each point is one week. A gap means that week has no number yet.</p>
      </div>
      <div className="chart-grid">
        {series.map((trend) => (
          <TrendCard key={trend.id} trend={trend} wide={trend.id === 'views'} />
        ))}
      </div>
    </section>
  );
}

function TrendCard({ trend, wide }: { trend: Trend; wide: boolean }) {
  const numbers = trend.points.flatMap((point) => (isNumber(point.value) ? [point.value] : []));
  return (
    <article className={wide ? 'chart-card wide' : 'chart-card'}>
      <h4>{trend.title}</h4>
      <p className="quiet">{trend.plain}</p>
      {numbers.length === 0 ? (
        <p className="chart-empty">
          <Missing />
        </p>
      ) : (
        <>
          <div className="chart-plot" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E6DDD2" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#5E6A63', fontSize: 12, fontFamily: 'Outfit, sans-serif' }}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: '#5E6A63', fontSize: 12, fontFamily: 'Outfit, sans-serif' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(value: number) => formatTick(trend, value)}
                  domain={domainFor(trend, numbers)}
                  tickCount={trend.kind === 'percent' ? 5 : 4}
                />
                <Tooltip content={<TrendTooltip trend={trend} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2F4A3A"
                  strokeWidth={2.25}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={{ r: 4, fill: '#FAF7F2', stroke: '#2F4A3A', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#E9C9C1', stroke: '#2F4A3A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{trend.title}</caption>
            <tbody>
              {trend.points.map((point) => (
                <tr key={point.weekStart}>
                  <th scope="row">{point.week}</th>
                  <td>{point.value === null ? 'not available yet' : formatPoint(trend, point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </article>
  );
}

function domainFor(trend: Trend, numbers: number[]): [number, number] | [number, 'auto'] {
  if (trend.kind === 'percent') return [0, 1];
  if (trend.kind === 'followers') return followerDomain(numbers);
  return [0, 'auto'];
}

function formatTick(trend: Trend, value: number): string {
  if (trend.kind === 'percent') return `${Math.round(value * 100)}%`;
  return formatCount(value);
}

function formatPoint(trend: Trend, value: number): string {
  if (trend.kind === 'percent') return formatPercentFromFraction(value);
  return formatCount(value);
}

function TrendTooltip({
  active,
  payload,
  trend,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
  trend: Trend;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tip">
      <p>{point.week}</p>
      <strong>{point.value === null ? 'not available yet' : formatPoint(trend, point.value)}</strong>
    </div>
  );
}
