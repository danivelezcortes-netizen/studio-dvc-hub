'use client';

import { useMemo, useState } from 'react';
import { Dash } from './Dash';
import { Thumb } from './Thumb';
import { formatDecimal, formatInt, formatPercent } from '@/lib/format';
import type { PostView } from '@/lib/types';
import { placementClass } from '@/lib/placement';

type SortKey = 'fecha' | 'dia' | 'hora' | 'views' | 'retencion' | 'shares' | 'saves';

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'dia', label: 'Día de la semana' },
  { value: 'hora', label: 'Hora' },
  { value: 'views', label: 'Visualizaciones' },
  { value: 'retencion', label: 'Retención' },
  { value: 'shares', label: 'Compartidos' },
  { value: 'saves', label: 'Guardados' },
];

export function PostsTable({ posts }: { posts: PostView[] }) {
  const [sort, setSort] = useState<SortKey>('fecha');
  const rows = useMemo(() => sortPosts(posts, sort), [posts, sort]);

  return (
    <div>
      <label className="sort">
        <span>Ordenar</span>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th />
              <th>Publicación</th>
              <th>Día y hora</th>
              <th className="num">Views</th>
              <th className="num metric-retention">Ret. 3 s</th>
              <th className="num metric-shares">Comp. / 1.000</th>
              <th className="num metric-saves">Guard. / 1.000</th>
              <th className="num metric-follows">Follows</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((post) => (
              <tr key={post.id}>
                <td>
                  <Thumb id={post.id} alt={post.alt} hasThumbnail={post.hasThumbnail} />
                </td>
                <td>
                  <strong>{post.title}</strong>
                  <span className={`pill ${placementClass(post)}`}>{post.placementLabel}</span>
                </td>
                <td>{post.postedLabel}</td>
                <td className="num">{showInt(post.views)}</td>
                <td className="num">{showRetention(post)}</td>
                <td className="num">{showDecimal(post.sharesPer1k)}</td>
                <td className="num">{showDecimal(post.savesPer1k)}</td>
                <td className="num">{showFollows(post)}</td>
                <td>
                  {post.permalink ? (
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  ) : (
                    <Dash />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="post-cards">
        {rows.map((post) => (
          <article key={post.id} className="post-card">
            <Thumb id={post.id} alt={post.alt} hasThumbnail={post.hasThumbnail} tall />
            <p className="meta">{post.postedLabel}</p>
            <h3>{post.title}</h3>
            <p className={`pill ${placementClass(post)}`}>{post.placementLabel}</p>
            <p className="hook">{post.caption}</p>
            <dl>
              <div>
                <dt>Views</dt>
                <dd>{showInt(post.views)}</dd>
              </div>
              <div className="metric-retention">
                <dt>Ret. 3 s</dt>
                <dd>{showRetention(post)}</dd>
              </div>
              <div className="metric-shares">
                <dt>Comp. / 1.000</dt>
                <dd>{showDecimal(post.sharesPer1k)}</dd>
              </div>
              <div className="metric-saves">
                <dt>Guard. / 1.000</dt>
                <dd>{showDecimal(post.savesPer1k)}</dd>
              </div>
              <div className="metric-follows">
                <dt>Follows</dt>
                <dd>{showFollows(post)}</dd>
              </div>
            </dl>
            {post.permalink ? (
              <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                Ver en Instagram
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function sortPosts(posts: PostView[], sort: SortKey): PostView[] {
  return [...posts].sort((a, b) => {
    if (sort === 'fecha') return b.date.localeCompare(a.date) || (b.timeParis ?? '').localeCompare(a.timeParis ?? '');
    if (sort === 'dia') return (a.weekdayIndex ?? 99) - (b.weekdayIndex ?? 99) || (a.timeParis ?? '').localeCompare(b.timeParis ?? '');
    if (sort === 'hora') return (a.timeParis ?? '99:99').localeCompare(b.timeParis ?? '99:99') || b.date.localeCompare(a.date);
    const key = sort === 'views' ? 'views' : sort === 'retencion' ? 'retention' : sort === 'shares' ? 'sharesPer1k' : 'savesPer1k';
    return compareMissingLast(a[key], b[key]);
  });
}

function compareMissingLast(left: number | null, right: number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

function showInt(value: number | null) {
  if (value == null) return <Dash />;
  return formatInt(value);
}

function showDecimal(value: number | null) {
  if (value == null) return <Dash />;
  return formatDecimal(value);
}

function showRetention(post: PostView) {
  if (post.kind === 'Carrusel') return 'No aplica';
  if (post.retention == null) return <Dash />;
  return formatPercent(post.retention);
}

function showFollows(post: PostView) {
  if (post.follows == null) return <Dash />;
  return post.snapshot ? `${formatInt(post.follows)} (${post.snapshot})` : formatInt(post.follows);
}
