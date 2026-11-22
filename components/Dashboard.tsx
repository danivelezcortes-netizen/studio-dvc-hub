import { FollowsChart } from './FollowsChart';
import { Dash } from './Dash';
import { PostsTable } from './PostsTable';
import { Thumb } from './Thumb';
import { formatDecimal, formatInt, formatPercent } from '@/lib/format';
import { accountNonFollowerPercent, perThousand, slotRows, weekdayRows } from '@/lib/metrics';
import { placementClass } from '@/lib/placement';
import type { DashboardData, PostView, TimingRow } from '@/lib/types';
import type { ReactNode } from 'react';

const NAV = [
  ['cuenta', 'Cuenta'],
  ['mejores', 'Mejores'],
  ['peores', 'Menos'],
  ['todas', 'Publicaciones'],
  ['horario', 'Día y hora'],
  ['follows', 'Follows'],
  ['aprendido', 'Aprendido'],
  ['recomendaciones', 'Recomendaciones'],
  ['huecos', 'Huecos'],
];

export function Dashboard({ data }: { data: DashboardData }) {
  const { account, analysis, posts } = data;
  const nf = accountNonFollowerPercent(account.views, account.viewsNonFollowers);
  const followsPer1k = perThousand(account.follows, account.viewsNonFollowers);
  const onGrid = posts.filter((post) => post.placement === 'grid').length;
  const offGrid = posts.filter((post) => post.placement === 'not_on_grid').length;
  const best = cardsFor(posts, analysis.best);
  const worst = cardsFor(posts, analysis.worst);
  const facts = accountFacts(account);
  const followNotes: ReactNode[] = [];
  if (data.dailyZeroDays != null) {
    followNotes.push(<>Otros {data.dailyZeroDays} días de la ventana fueron 0 follows y 0 unfollows.</>);
  }
  if (data.dailyMissingDays != null && data.dailyMissingDays > 0) {
    followNotes.push(<>{data.dailyMissingDays} días todavía no tienen el dato.</>);
  }
  for (const note of analysis.followsNotes) followNotes.push(note);

  return (
    <div className="page">
      <header className="masthead">
        <p className="kicker">@studio.dvc</p>
        <h2>Analítica de Instagram</h2>
        <div className="text-card">
          <p className="lede">
            Desde el relanzamiento del 29 de octubre de 2026. Lectura: {data.pulledAtLabel}.
          </p>
          <p className={data.source === 'live' ? 'source live' : 'source sample'}>
            {data.source === 'live'
              ? 'Números en vivo de Instagram. Se guardan como mucho una hora para no pedirlos de más.'
              : 'Vista de muestra del 21 nov 2026. Falta IG_ACCESS_TOKEN, así que estos números no salen de una lectura nueva.'}
          </p>
        </div>
      </header>

      <section className="text-card">
        <h3>Cómo leer esta página</h3>
        <p>{analysis.howToRead}</p>
      </section>
      <section className="text-card">
        <h3>Cómo sabemos si un Reel es Trial o Grid</h3>
        <p>{analysis.trialExplainer}</p>
      </section>

      <section id="cuenta" className="block">
        <h3>Cifras de la cuenta, últimos 30 días</h3>
        <p className="quiet">{account.windowLabel}</p>
        <div className="stat-grid">
          <article className="stat">
            <p className="stat-label">Visualizaciones</p>
            <p className="stat-value">{account.views == null ? <Dash /> : formatInt(account.views)}</p>
            <p className="stat-plain">
              {nf == null || account.viewsNonFollowers == null || account.views == null ? (
                'El reparto entre seguidores y no seguidores no vino en esta lectura.'
              ) : (
                <>
                  {formatPercent(nf, 0)} no seguidores ({formatInt(account.viewsNonFollowers)} de {formatInt(account.views)})
                </>
              )}
            </p>
          </article>
          <article className="stat accent-follows">
            <p className="stat-label">Follows / unfollows</p>
            <p className="stat-value">
              {account.follows == null || account.unfollows == null ? (
                <Dash />
              ) : (
                `${formatInt(account.follows)} / ${formatInt(account.unfollows)}`
              )}
            </p>
            <p className="stat-plain">
              {followsPer1k == null
                ? 'Sigue faltando el dato para el ratio.'
                : `${formatDecimal(followsPer1k)} follows / 1.000 visualizaciones de no seguidores`}
            </p>
          </article>
          <article className="stat">
            <p className="stat-label">Seguidores ahora</p>
            <p className="stat-value">{account.followers == null ? <Dash /> : formatInt(account.followers)}</p>
            <p className="stat-plain">{analysis.followersNote}</p>
          </article>
          <article className="stat">
            <p className="stat-label">Grid / no en el grid</p>
            <p className="stat-value">
              {onGrid} / {offGrid}
            </p>
            <p className="stat-plain">
              Desde el 29 oct, entre {posts.length} publicaciones.
              {account.mediaCount == null ? '' : ` El perfil marca ${formatInt(account.mediaCount)} piezas.`}
            </p>
          </article>
        </div>
        {facts ? (
          <div className="text-card">
            <p className="facts">{facts}</p>
          </div>
        ) : null}
      </section>

      <section id="mejores" className="block">
        <div className="section-head">
          <h3>Los que mejor funcionan</h3>
          <span className="badge badge-good">Mejores</span>
        </div>
        <div className="text-card">
          <p>{analysis.bestCaption}</p>
        </div>
        <div className="card-grid">
          {best.map((item) => (
            <PostCard key={item.post.id} post={item.post} why={item.why} tone="good" />
          ))}
        </div>
        {analysis.bestMention ? (
          <div className="text-card">
            <p>{analysis.bestMention}</p>
          </div>
        ) : null}
      </section>

      <section id="peores" className="block">
        <div className="section-head">
          <h3>Los que menos llegaron</h3>
          <span className="badge badge-weak">Menos</span>
        </div>
        <div className="text-card">
          <p>{analysis.worstCaption}</p>
        </div>
        <div className="card-grid">
          {worst.map((item) => (
            <PostCard key={item.post.id} post={item.post} why={item.why} tone="weak" />
          ))}
        </div>
        {analysis.worstMention ? (
          <div className="text-card">
            <p>{analysis.worstMention}</p>
          </div>
        ) : null}
      </section>

      <section id="todas" className="block">
        <h3>Todas las publicaciones desde el 29 oct</h3>
        <div className="text-card">
          <p>
            Día y hora en hora de París. Visualizaciones, compartidos, guardados y retención salen de esta lectura. Los follows
            por post son los recortes pegados en el archivo de textos, con su fecha. Un guión significa que no hay dato, no que
            el valor sea cero.
          </p>
        </div>
        <PostsTable posts={posts} />
      </section>

      <section id="horario" className="block">
        <h3>Día y hora vs rendimiento</h3>
        <div className="text-card">
          <p>
            Observación con muestra pequeña. Las medias de retención solo usan Reels (el carrusel no tiene retención a 3 s). Grid
            y Trial van separados para no mezclar el día con el lugar donde se publicó.
          </p>
          {analysis.scheduleIntro ? <p>{analysis.scheduleIntro}</p> : null}
        </div>
        <h4>Por día</h4>
        <TimingTable rows={weekdayRows(posts)} first="Día" />
        <h4>Por franja</h4>
        <TimingTable rows={slotRows(posts)} first="Franja" />
        {analysis.scheduleNotes.length > 0 ? (
          <div className="text-card">
            {analysis.scheduleNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section id="follows" className="block">
        <h3>Follows y unfollows por día</h3>
        <div className="text-card">
          <p>{analysis.followsCaption}</p>
        </div>
        <FollowsChart days={data.daily} />
        <ul className="sr-only">
          {data.daily.map((day) => (
            <li key={day.date}>
              {day.label}: {day.follows ?? 'sin dato'} follows, {day.unfollows ?? 'sin dato'} unfollows
            </li>
          ))}
        </ul>
        {followNotes.length > 0 ? (
          <div className="text-card">
            {followNotes.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section id="aprendido" className="block">
        <h3>Lo que hemos aprendido</h3>
        <ol className="notes text-card">
          {analysis.learnings.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section id="recomendaciones" className="block">
        <h3>Recomendaciones</h3>
        <ol className="notes text-card">
          {analysis.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section id="huecos" className="block">
        <h3>Huecos de datos</h3>
        <ul className="notes text-card">
          {analysis.gaps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="text-card">
          <p>
            Última nota de textos: {analysis.updatedAtLabel}. {analysis.gapsClosing}
          </p>
        </div>
      </section>
    </div>
  );
}

export function sectionLinks() {
  return NAV;
}

function PostCard({ post, why, tone }: { post: PostView; why: string; tone: 'good' | 'weak' }) {
  return (
    <article className="story">
      <Thumb id={post.id} alt={post.alt} hasThumbnail={post.hasThumbnail} tall />
      <p className="meta">{post.postedLabel} · hora de París</p>
      <h4>{post.title}</h4>
      <p className="hook">{post.caption}</p>
      <p>
        <span className={`pill ${placementClass(post)}`}>{post.placementLabel}</span>{' '}
        <span className={tone === 'good' ? 'badge badge-good' : 'badge badge-weak'}>
          {tone === 'good' ? 'Mejores' : 'Menos'}
        </span>
      </p>
      <dl className="specs">
        <div>
          <dt>Visualizaciones</dt>
          <dd>{post.views == null ? <Dash /> : formatInt(post.views)}</dd>
        </div>
        <div>
          <dt>Alcance</dt>
          <dd>{post.reach == null ? <Dash /> : formatInt(post.reach)}</dd>
        </div>
        <div className="metric-retention">
          <dt>Retención 3 s</dt>
          <dd>{post.kind === 'Carrusel' ? 'No aplica (carrusel)' : post.retention == null ? <Dash /> : formatPercent(post.retention)}</dd>
        </div>
        <div className="metric-shares">
          <dt>Compartidos / 1.000</dt>
          <dd>
            {post.sharesPer1k == null || post.shares == null ? (
              <Dash />
            ) : (
              `${formatDecimal(post.sharesPer1k)} (${formatInt(post.shares)} compartidos)`
            )}
          </dd>
        </div>
        <div className="metric-saves">
          <dt>Guardados / 1.000</dt>
          <dd>
            {post.savesPer1k == null || post.saves == null ? (
              <Dash />
            ) : (
              `${formatDecimal(post.savesPer1k)} (${formatInt(post.saves)} guardados)`
            )}
          </dd>
        </div>
        <div className="metric-follows">
          <dt>Follows / 1.000 no seguidores</dt>
          <dd>
            {post.followsPer1kNf == null || post.follows == null
              ? 'Sin dato por post'
              : `${formatDecimal(post.followsPer1kNf)} (${formatInt(post.follows)} follows${post.snapshot ? `, recorte del ${post.snapshot}` : ''})`}
          </dd>
        </div>
      </dl>
      <p className="why">{why}</p>
      {post.permalink ? (
        <a href={post.permalink} target="_blank" rel="noopener noreferrer">
          Ver en Instagram
        </a>
      ) : null}
    </article>
  );
}

function TimingTable({ rows, first }: { rows: TimingRow[]; first: string }) {
  return (
    <div className="table-scroll timing">
      <table>
        <thead>
          <tr>
            <th>{first}</th>
            <th className="num">n Grid</th>
            <th className="num">Views media Grid</th>
            <th className="num metric-retention">Ret. media Grid</th>
            <th className="num">n Trial</th>
            <th className="num">Views media Trial</th>
            <th className="num metric-retention">Ret. media Trial</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td className="num">{row.gridN}</td>
              <td className="num">{row.gridViews == null ? <Dash /> : formatDecimal(row.gridViews)}</td>
              <td className="num">{row.gridRetention == null ? <Dash /> : formatPercent(row.gridRetention)}</td>
              <td className="num">{row.trialN}</td>
              <td className="num">{row.trialViews == null ? <Dash /> : formatDecimal(row.trialViews)}</td>
              <td className="num">{row.trialRetention == null ? <Dash /> : formatPercent(row.trialRetention)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cardsFor(posts: PostView[], picks: { mediaId: string; why: string }[]) {
  return picks.flatMap((item) => {
    const post = posts.find((candidate) => candidate.id === item.mediaId);
    return post ? [{ post, why: item.why }] : [];
  });
}

function accountFacts(account: DashboardData['account']): string {
  const bits: string[] = [];
  if (account.reach != null) bits.push(`Alcance ${formatInt(account.reach)}`);
  if (account.accountsEngaged != null) bits.push(`cuentas que interactuaron ${formatInt(account.accountsEngaged)}`);
  if (account.interactions != null) bits.push(`interacciones ${formatInt(account.interactions)}`);
  if (account.shares != null) bits.push(`${formatInt(account.shares)} compartidos`);
  if (account.saves != null) bits.push(`${formatInt(account.saves)} guardados`);
  return bits.join('. ') + (bits.length ? '.' : '');
}
