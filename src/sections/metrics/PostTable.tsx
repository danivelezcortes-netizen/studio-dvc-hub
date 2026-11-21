import { useMemo, useState, type ReactNode } from 'react';
import { Band } from '../../components/Band';
import { Missing } from '../../components/Missing';
import { ratios, startingThresholdNote, type RatioKey } from '../../config/thresholds';
import {
  defaultDirection,
  formatCount,
  formatLongDate,
  hasUnset,
  isNumber,
  rateRatio,
  sortPosts,
  thresholdPhrase,
  uniqueOptions,
  type SortDirection,
  type SortKey,
} from '../../lib/metrics';
import type { Post } from '../../types';
import { RatioCharts } from './RatioCharts';

type FieldFilter = 'all' | 'unset' | string;

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'date', label: 'Date', numeric: false },
  { key: 'title', label: 'Post', numeric: false },
  { key: 'format', label: 'Format', numeric: false },
  { key: 'pillar', label: 'Pillar', numeric: false },
  { key: 'views', label: 'Views', numeric: true },
  { key: 'shares', label: 'Shares', numeric: true },
  { key: 'saves', label: 'Saves', numeric: true },
  { key: 'sharesPer1000Views', label: 'Shares per 1,000 views', numeric: true },
  { key: 'savesPer1000Views', label: 'Saves per 1,000 views', numeric: true },
  { key: 'followsPer1000NonFollowerViews', label: 'Follows per 1,000 non-follower views', numeric: true },
  { key: 'retention3s', label: '3-second retention', numeric: true },
];

const ratioKeys = new Set<SortKey>(ratios.map((ratio) => ratio.key));

export function PostTable({
  posts,
  baselineLabel,
  excluded,
}: {
  posts: Post[];
  baselineLabel: string;
  excluded: number;
}) {
  const [format, setFormat] = useState<FieldFilter>('all');
  const [pillar, setPillar] = useState<FieldFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const formats = uniqueOptions(posts, 'format');
  const pillars = uniqueOptions(posts, 'pillar');
  const visible = useMemo(
    () => sortPosts(posts.filter((post) => matches(post, format, pillar)), sortKey, direction),
    [posts, format, pillar, sortKey, direction],
  );

  function chooseSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setDirection(defaultDirection(key));
  }

  return (
    <section className="block">
      <div className="block-head">
        <h3>Each post</h3>
        <p className="quiet">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} since {baselineLabel}.
          {excluded > 0
            ? ` ${excluded} earlier ${excluded === 1 ? 'post is' : 'posts are'} left out.`
            : ''}
        </p>
      </div>

      <div className="filters">
        <Filter label="Format" value={format} onChange={setFormat} options={formats} unset={hasUnset(posts, 'format')} />
        <Filter label="Pillar" value={pillar} onChange={setPillar} options={pillars} unset={hasUnset(posts, 'pillar')} />
        <label className="filter">
          <span>Sort by</span>
          <select
            value={sortKey}
            onChange={(event) => {
              const key = event.target.value as SortKey;
              setSortKey(key);
              setDirection(defaultDirection(key));
            }}
          >
            {columns.map((column) => (
              <option key={column.key} value={column.key}>
                {column.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="text-button" onClick={() => setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
          {directionLabel(sortKey, direction)}
        </button>
      </div>

      <aside className="guide">
        <h4>How to read weak, watch, and good</h4>
        <p>{startingThresholdNote}</p>
        <ul>
          {ratios.map((rule) => (
            <li key={rule.key}>
              <strong>{rule.title}.</strong> {rule.plain}. {thresholdPhrase(rule)}
            </li>
          ))}
        </ul>
        <p className="dash-note">A dash means the number is not in yet. A zero means the real count was zero.</p>
      </aside>

      <p className="quiet result-count">
        Showing {visible.length} {visible.length === 1 ? 'post' : 'posts'}
      </p>
      <p className="quiet scroll-hint">Scroll sideways to see every score. The date and the post stay put.</p>

      {visible.length === 0 ? (
        <p className="empty-filter">No posts match. Try another format or pillar.</p>
      ) : (
        <>
          <div className="table-scroll post-table">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={sortKey === column.key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={columnClass(column)}
                    >
                      <button type="button" onClick={() => chooseSort(column.key)}>
                        {column.label}
                        {sortKey === column.key ? <span aria-hidden="true">{direction === 'asc' ? ' ↑' : ' ↓'}</span> : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((post) => (
                  <tr key={`${post.date}-${post.title}`}>
                    <td className="sticky sticky-date">{formatLongDate(post.date)}</td>
                    <td className="sticky sticky-post">
                      <PostTitle post={post} />
                    </td>
                    <td>{post.format ? post.format : <Missing />}</td>
                    <td>{post.pillar ? post.pillar : <Missing />}</td>
                    <td className="num">{showCount(post.views)}</td>
                    <td className="num">{showCount(post.shares)}</td>
                    <td className="num">{showCount(post.saves)}</td>
                    {ratios.map((rule) => (
                      <td key={rule.key} className="num">
                        <RatioValue post={post} ratioKey={rule.key} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="post-cards">
            {visible.map((post) => (
              <article key={`${post.date}-${post.title}`} className="post-card">
                <p className="meta">{formatLongDate(post.date)}</p>
                <h4>
                  <PostTitle post={post} />
                </h4>
                <p className="meta">
                  {post.format ? post.format : <Missing />} · {post.pillar ? post.pillar : <Missing />}
                </p>
                <div className="stat-pairs">
                  <Pair label="Views" value={showCount(post.views)} />
                  <Pair label="Shares" value={showCount(post.shares)} />
                  <Pair label="Saves" value={showCount(post.saves)} />
                </div>
                <dl className="ratio-list">
                  {ratios.map((rule) => (
                    <div key={rule.key}>
                      <dt>{rule.title}</dt>
                      <dd>
                        <RatioValue post={post} ratioKey={rule.key} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      <RatioCharts posts={visible} />
    </section>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  unset,
}: {
  label: string;
  value: FieldFilter;
  onChange: (value: FieldFilter) => void;
  options: string[];
  unset: boolean;
}) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {unset ? <option value="unset">Not set yet</option> : null}
      </select>
    </label>
  );
}

function PostTitle({ post }: { post: Post }) {
  return (
    <>
      {post.postLink ? (
        <a href={post.postLink} target="_blank" rel="noopener noreferrer">
          {post.title}
          <span className="sr-only"> (opens Instagram)</span>
        </a>
      ) : (
        post.title
      )}
      {post.note ? <span className="post-note">{post.note}</span> : null}
    </>
  );
}

function Pair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function RatioValue({ post, ratioKey }: { post: Post; ratioKey: RatioKey }) {
  const rated = rateRatio(post, ratioKey);
  if (!rated.shown || !rated.band) return <Missing />;
  return (
    <span className="ratio">
      <span>{rated.shown}</span>
      <Band band={rated.band} />
    </span>
  );
}

function showCount(value: number | null): ReactNode {
  if (!isNumber(value)) return <Missing />;
  return formatCount(value);
}

function matches(post: Post, format: FieldFilter, pillar: FieldFilter): boolean {
  return fieldMatches(post.format, format) && fieldMatches(post.pillar, pillar);
}

function fieldMatches(value: string | null, filter: FieldFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unset') return !value;
  return value === filter;
}

function columnClass(column: { key: SortKey; numeric: boolean }): string {
  const names = [column.numeric ? 'num' : ''];
  if (column.key === 'date') names.push('sticky', 'sticky-date');
  if (column.key === 'title') names.push('sticky', 'sticky-post');
  return names.filter(Boolean).join(' ');
}

function directionLabel(key: SortKey, direction: SortDirection): string {
  if (key === 'date') return direction === 'desc' ? 'Newest first' : 'Oldest first';
  if (!ratioKeys.has(key) && (key === 'title' || key === 'format' || key === 'pillar')) {
    return direction === 'asc' ? 'A to Z' : 'Z to A';
  }
  return direction === 'desc' ? 'Highest first' : 'Lowest first';
}
