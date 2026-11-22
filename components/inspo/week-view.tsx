"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { entriesForWeek, knownWeeks, weekRangeLabel } from "@/lib/inspo/weeks";
import type { FrameKind, InspoItem } from "@/lib/inspo/types";

const SWATCH: Record<FrameKind, { bg: string; fg: string; mark: string }> = {
  sophie: { bg: "#f6f3ec", fg: "#161216", mark: "Aa" },
  linda: { bg: "#ff2d9a", fg: "#ffffff", mark: "03" },
  howrad: { bg: "#e7d52b", fg: "#161216", mark: "me" },
  dario: { bg: "#161216", fg: "#e7d52b", mark: "BAG" },
  lart: { bg: "#ffffff", fg: "#ff2d9a", mark: "MAY" },
  intocarry: { bg: "#ffffff", fg: "#161216", mark: "01" },
  mnera: { bg: "#f3e27a", fg: "#161216", mark: "Aa" },
  soulful: { bg: "#ff2d9a", fg: "#161216", mark: "my" },
  zeopatra: { bg: "#d7d3cc", fg: "#161216", mark: "br" },
};

export function WeekView({
  items,
  currentWeek,
  onOpen,
  onUsed,
  onRollover,
  onClear,
  busy,
}: {
  items: InspoItem[];
  currentWeek: string;
  onOpen: (id: string) => void;
  onUsed: (id: string, weekKey: string, used: boolean) => void;
  onRollover: (weekKey: string) => void;
  onClear: (weekKey: string) => void;
  busy: boolean;
}) {
  const past = knownWeeks(items).filter((week) => week < currentWeek);
  return (
    <div className="week-stack">
      <WeekBlock
        title="Esta semana"
        range={weekRangeLabel(currentWeek)}
        weekKey={currentWeek}
        items={items}
        onOpen={onOpen}
        onUsed={onUsed}
        busy={busy}
        actions={
          <div className="week-actions">
            <button type="button" className="week-btn primary" disabled={busy} onClick={() => onRollover(currentWeek)}>
              Pasar pendientes a la próxima
            </button>
            <button type="button" className="week-btn" disabled={busy} onClick={() => onClear(currentWeek)}>
              Vaciar pendientes
            </button>
          </div>
        }
      />
      <section className="week-past">
        <h2 className="hook-title">Semanas anteriores</h2>
        {past.length === 0 ? <p className="mt-3 text-sm text-[#5c585e]">Todavía no hay semanas cerradas.</p> : null}
        <div className="week-stack">
          {past.map((week) => (
            <WeekBlock
              key={week}
              title={week}
              range={weekRangeLabel(week)}
              weekKey={week}
              items={items}
              onOpen={onOpen}
              onUsed={onUsed}
              busy={busy}
              actions={
                entriesForWeek(items, week).some((entry) => !entry.used && !entry.archived) ? (
                  <button type="button" className="week-btn" disabled={busy} onClick={() => onRollover(week)}>
                    Pasar pendientes a la semana siguiente
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function WeekBlock({
  title,
  range,
  weekKey,
  items,
  onOpen,
  onUsed,
  actions,
  busy,
}: {
  title: string;
  range: string;
  weekKey: string;
  items: InspoItem[];
  onOpen: (id: string) => void;
  onUsed: (id: string, weekKey: string, used: boolean) => void;
  actions?: React.ReactNode;
  busy: boolean;
}) {
  const entries = entriesForWeek(items, weekKey);
  const used = entries.filter((entry) => entry.used).length;
  return (
    <section className="week-block">
      <header className="week-head">
        <div>
          <p className="meta">Semana</p>
          <h3 className="text-2xl font-extrabold tracking-[-0.04em]">{title}</h3>
          <p className="meta mt-1">{range}</p>
        </div>
        <p className="meta">
          {used} {used === 1 ? "usada" : "usadas"} · {Math.max(entries.length - used, 0)}{" "}
          {entries.length - used === 1 ? "pendiente" : "pendientes"}
        </p>
      </header>
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-sm">Esta semana todavía no tiene nada. El corazón de una tarjeta la suma aquí.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={`${weekKey}-${entry.item.id}`} className="week-row">
              <Checkbox
                checked={entry.used}
                disabled={busy}
                aria-label={entry.used ? "Marcada como usada" : "Marcar como usada"}
                onCheckedChange={(checked) => onUsed(entry.item.id, weekKey, checked)}
                className="week-check"
              />
              <button type="button" onClick={() => onOpen(entry.item.id)} className="week-open">
                <Thumb item={entry.item} />
                <span className="week-copy">
                  <span className="week-title">{entry.item.title}</span>
                  <span className="meta text-[#5c585e]">
                    {entry.item.source}
                    {entry.archived ? " · archivo" : ""}
                    {entry.used ? " · usada" : " · pendiente"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {actions ? <div className="week-foot">{actions}</div> : null}
    </section>
  );
}

function Thumb({ item }: { item: InspoItem }) {
  if (item.imagePath || item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.imagePath || item.imageUrl} alt="" className="week-thumb" />
    );
  }
  if (item.frame) {
    const swatch = SWATCH[item.frame];
    return (
      <span
        className="week-thumb week-swatch"
        style={{ background: swatch.bg, color: swatch.fg }}
      >
        {swatch.mark}
      </span>
    );
  }
  return <span className="meta week-thumb week-swatch">Sin captura</span>;
}
