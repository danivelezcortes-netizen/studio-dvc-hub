"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Heart, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "./card";
import { DetailSheet } from "./detail-sheet";
import { ItemForm, emptyDraft } from "./item-form";
import { WeekView } from "./week-view";
import { EMPTY_FILTERS, filterItems, groupByDay, type BoardFilters } from "@/lib/inspo/filters";
import { PILLARS, PILLAR_COLOR, pillarInk, SOURCES, STATUSES, type BoardSnapshot, type InspoItem, type ItemInput, type Pillar } from "@/lib/inspo/types";
import { countWeek, formatSavedDay, isNewItem, isoWeekKey, weekRangeLabel } from "@/lib/inspo/weeks";

type View = "board" | "hooks" | "week";

async function send(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
  return data;
}

export function InspoApp({ initial }: { initial: BoardSnapshot }) {
  const [board, setBoard] = useState(initial);
  const [view, setView] = useState<View>("board");
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ItemInput>(emptyDraft());
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentWeek = isoWeekKey(board.now);
  const openItem = board.items.find((item) => item.id === openId) ?? null;

  const visible = useMemo(() => {
    return filterItems(board.items, {
      ...filters,
      hooksOnly: view === "hooks",
      tags: view === "hooks" ? [] : filters.tags,
      source: view === "hooks" ? "" : filters.source,
      type: view === "hooks" ? "" : filters.type,
    });
  }, [board.items, filters, view]);

  const groups = useMemo(() => groupByDay(visible), [visible]);
  const weekCount = countWeek(board.items, currentWeek);
  const hookCount = board.items.filter((item) => item.type === "hook").length;

  async function refresh() {
    const next = (await send("/api/inspo/items")) as BoardSnapshot;
    setBoard(next);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function saveNew() {
    const form = new FormData();
    form.set("payload", JSON.stringify(draft));
    if (file) form.set("image", file);
    await run(async () => {
      await send("/api/inspo/items", { method: "POST", body: form });
      await refresh();
      setAdding(false);
      setDraft(emptyDraft());
      setFile(null);
    });
  }

  return (
    <div className="inspo min-h-screen bg-white text-[#161216]">
      <a href="#tablero" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[#E7D52B] focus:px-3 focus:py-2">
        Saltar al tablero
      </a>
      <header className="toolbar">
        <div className="toolbar-row">
          <button
            type="button"
            onClick={() => setView("board")}
            data-tone={view === "board" ? "yellow" : "plain"}
            aria-current={view === "board" ? "page" : undefined}
          >
            Tablero
          </button>
          <label className="search-field">
            <Search aria-hidden="true" />
            <Input
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              placeholder="Buscar hook, cuenta, material, bolso..."
              aria-label="Buscar"
              className="h-9 rounded-full border-[#161216]"
            />
          </label>
          <button
            type="button"
            onClick={() => setView("week")}
            data-tone={view === "week" ? "ink" : "plain"}
            aria-current={view === "week" ? "page" : undefined}
          >
            <Heart className="size-3.5" fill={weekCount ? "currentColor" : "none"} />
            Esta semana · {weekCount}
          </button>
          <Button
            type="button"
            className="agregar"
            onClick={() => {
              setDraft(emptyDraft());
              setFile(null);
              setAdding(true);
            }}
          >
            <Plus className="size-4" />
            Agregar
          </Button>
          <button
            type="button"
            onClick={() => setView("hooks")}
            data-tone={view === "hooks" ? "yellow" : "ink"}
            aria-current={view === "hooks" ? "page" : undefined}
          >
            Hooks ({hookCount})
          </button>
        </div>
      </header>

      {error ? (
        <p className="border-b border-[#FF2D9A] bg-white px-4 py-2 text-sm text-[#FF2D9A]" role="alert">
          {error}
        </p>
      ) : null}
      {board.backup === "pending" ? (
        <p className="border-b border-[#FF8C00] bg-white px-4 py-2 text-sm" role="alert">
          Guardado en la base de datos. La copia en Notion sigue pendiente
          {board.backupError ? `: ${board.backupError}` : ""}.
        </p>
      ) : null}

      <main id="tablero" className="px-4 pt-5 pb-28 md:px-6">
        {view !== "week" ? (
          <Filters view={view} filters={filters} items={board.items} onChange={setFilters} />
        ) : null}

        {view === "week" ? (
          <WeekView
            items={board.items}
            currentWeek={currentWeek}
            busy={busy}
            onOpen={setOpenId}
            onUsed={(id, weekKey, used) => {
              void run(async () => {
                await send(`/api/inspo/items/${id}/used`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ weekKey, used }),
                });
                await refresh();
              }).catch(() => undefined);
            }}
            onRollover={(weekKey) => {
              void run(async () => {
                const next = (await send("/api/inspo/weeks", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "rollover", weekKey }),
                })) as BoardSnapshot;
                setBoard(next);
              });
            }}
            onClear={(weekKey) => {
              void run(async () => {
                const next = (await send("/api/inspo/weeks", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "clear", weekKey }),
                })) as BoardSnapshot;
                setBoard(next);
              });
            }}
          />
        ) : visible.length === 0 ? (
          <Empty view={view} onReset={() => setFilters(EMPTY_FILTERS)} />
        ) : (
          <div className="grid gap-8">
            {view === "hooks" ? <h1 className="hook-title text-4xl">Todos los hooks</h1> : null}
            {groups.map((group, index) => (
              <section key={group.day}>
                {index === 0 && isoWeekKey(`${group.day}T12:00:00Z`) === currentWeek ? (
                  <p className="meta mb-3 bg-[#E7D52B] px-3 py-2">
                    Esta semana · {weekRangeLabel(currentWeek)} · {group.items.filter((item) => isNewItem(item.savedAt, board.now)).length} nuevos
                  </p>
                ) : null}
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="meta">{sectionTitle(group.day, group.items, board.now)}</h2>
                  <span className="h-px flex-1 bg-[#161216]" />
                </div>
                <div className="masonry">
                  {group.items.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      now={board.now}
                      onOpen={setOpenId}
                      onHeart={(id) => {
                        void run(async () => {
                          await send(`/api/inspo/items/${id}/heart`, { method: "POST" });
                          await refresh();
                        }).catch(() => undefined);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="meta mt-10 text-[#5c585e]">
          {board.storage === "postgres"
            ? board.backup === "ok"
              ? "Guardado en la base y copiado a Notion"
              : "Guardado en la base. Notion pendiente"
            : "Archivo local de esta máquina"}{" "}
          · {board.items.length} referencias
        </p>
      </main>

      <nav className="mobile-nav" aria-label="Vistas móviles">
        {(
          [
            ["board", "Tablero"],
            ["hooks", "Hooks"],
            ["week", "Semana"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className="meta" data-tone={view === id ? "yellow" : "plain"} onClick={() => setView(id)}>
            {label}
            {id === "week" ? ` ${weekCount}` : ""}
          </button>
        ))}
      </nav>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none border border-[#161216] bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="hook-title text-3xl">Agregar</DialogTitle>
            <DialogDescription>Una referencia nueva para el tablero. La fuente queda guardada con la pieza.</DialogDescription>
          </DialogHeader>
          <ItemForm value={draft} onChange={setDraft} file={file} onFile={setFile} showWeek />
          <Button type="button" disabled={busy || !draft.title.trim()} className="h-11 rounded-none bg-[#E7D52B] text-[#161216]" onClick={() => void saveNew().catch(() => undefined)}>
            {busy ? "Guardando…" : "Guardar en el tablero"}
          </Button>
        </DialogContent>
      </Dialog>

      <DetailSheet
        item={openItem}
        open={Boolean(openItem)}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        busy={busy}
        onSave={async (input, nextFile, removeImage) => {
          if (!openItem) return;
          const form = new FormData();
          form.set("payload", JSON.stringify(input));
          if (nextFile) form.set("image", nextFile);
          if (removeImage) form.set("removeImage", "true");
          await run(async () => {
            await send(`/api/inspo/items/${openItem.id}`, { method: "PATCH", body: form });
            await refresh();
          });
        }}
        onDelete={async () => {
          if (!openItem) return;
          await run(async () => {
            await send(`/api/inspo/items/${openItem.id}`, { method: "DELETE" });
            setOpenId(null);
            await refresh();
          });
        }}
        onAddNote={async (text) => {
          if (!openItem) return;
          await run(async () => {
            await send(`/api/inspo/items/${openItem.id}/notes`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ text }),
            });
            await refresh();
          });
        }}
        onEditNote={async (noteId, text) => {
          if (!openItem) return;
          await run(async () => {
            await send(`/api/inspo/items/${openItem.id}/notes/${noteId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ text }),
            });
            await refresh();
          });
        }}
      />
    </div>
  );
}

const MAIN_TAGS = ["Handbags", "Outfits", "Hooks", "Trends", "Sonidos", "Texto en pantalla"] as const;

function countOf(items: InspoItem[], tag: string): number {
  if (tag === "Hooks") return items.filter((item) => item.type === "hook" || item.tags.includes("Hooks")).length;
  if (tag === "Texto en pantalla") return items.filter((item) => item.type === "texto" || item.tags.includes(tag)).length;
  if (tag === "Outfits") return items.filter((item) => item.type === "outfit" || item.tags.includes(tag)).length;
  if (tag === "Handbags") return items.filter((item) => item.tags.includes("Handbags") || item.tags.includes("Bolsos")).length;
  return items.filter((item) => item.tags.includes(tag) || item.pillar === tag).length;
}

function sectionTitle(day: string, items: InspoItem[], now: string): string {
  const label = formatSavedDay(day);
  const added = items[0]?.addedBy;
  if (added === "Rutina IG lunes") return `${label} · Reporte IG lunes · ${items.length} guardados`;
  if (added === "Vogue viernes") return `${label} · Vogue viernes`;
  if (added === "Daniela") return `${label} · Daniela`;
  const fresh = items.filter((item) => isNewItem(item.savedAt, now)).length;
  return fresh ? `${label} · ${fresh} nuevos` : label;
}

function Filters({
  view,
  filters,
  items,
  onChange,
}: {
  view: View;
  filters: BoardFilters;
  items: InspoItem[];
  onChange: (next: BoardFilters) => void;
}) {
  const activeTags = view === "hooks" ? [] : filters.tags;
  return (
    <div className="filters">
      <div className="chip-row">
        <Chip on={activeTags.length === 0 && !filters.pillar} onClick={() => onChange({ ...filters, tags: [], pillar: "" })}>
          Todos · {items.length}
        </Chip>
        {view === "hooks"
          ? null
          : MAIN_TAGS.map((tag) => (
              <Chip
                key={tag}
                on={filters.tags.includes(tag)}
                onClick={() =>
                  onChange({
                    ...filters,
                    tags: filters.tags.includes(tag) ? filters.tags.filter((item) => item !== tag) : [...filters.tags, tag],
                  })
                }
              >
                {tag} · {countOf(items, tag)}
              </Chip>
            ))}
        {PILLARS.map((pillar) => (
          <button
            key={pillar}
            type="button"
            aria-pressed={filters.pillar === pillar}
            onClick={() => onChange({ ...filters, pillar: filters.pillar === pillar ? "" : pillar })}
            className="meta shrink-0 rounded-full px-3 py-1.5"
            style={{
              background: PILLAR_COLOR[pillar as Pillar],
              color: pillarInk(pillar as Pillar),
              outline: filters.pillar === pillar ? "2px solid #161216" : "none",
              outlineOffset: 1,
            }}
          >
            {pillar}
          </button>
        ))}
      </div>
      <div className="chip-wrap">
        <span className="meta text-[#5c585e]">{view === "hooks" ? "Estado" : "Fuente"}</span>
        {(view === "hooks" ? ["", ...STATUSES] : ["", ...SOURCES]).map((value) => {
          const current = view === "hooks" ? filters.status : filters.source;
          const on = current === value;
          const label = value || (view === "hooks" ? "Todos" : "Todas");
          return (
            <Chip
              key={label}
              on={on}
              onClick={() => onChange(view === "hooks" ? { ...filters, status: value } : { ...filters, source: value })}
            >
              {label}
            </Chip>
          );
        })}
        {view === "hooks" ? (
          <Chip on={filters.withShot} onClick={() => onChange({ ...filters, withShot: !filters.withShot })}>
            Solo con captura
          </Chip>
        ) : (
          <>
            <span className="meta ml-2 text-[#5c585e]">Añadido por</span>
            {(
              [
                ["", "Todos"],
                ["Rutinas", "Rutinas"],
                ["Daniela", "Daniela"],
              ] as const
            ).map(([value, label]) => (
              <Chip key={label} on={filters.addedBy === value} onClick={() => onChange({ ...filters, addedBy: value })}>
                {label}
              </Chip>
            ))}
          </>
        )}
        {filters.tags.length || filters.source || filters.pillar || filters.addedBy || filters.query || filters.status || filters.withShot ? (
          <button type="button" className="meta underline" onClick={() => onChange(EMPTY_FILTERS)}>
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-tone={on ? "ink" : "plain"}
    >
      {children}
    </button>
  );
}

function Empty({ view, onReset }: { view: View; onReset: () => void }) {
  return (
    <div className="border border-[#161216] px-5 py-12">
      <p className="hook-title text-3xl">{view === "hooks" ? "Ningún hook con ese filtro." : "Nada con esos filtros."}</p>
      <p className="mt-2 max-w-md text-sm">Quita un filtro o limpia la búsqueda y el tablero vuelve a llenarse.</p>
      <button type="button" className="meta mt-4 border border-[#161216] bg-[#E7D52B] px-3 py-2" onClick={onReset}>
        Ver todo
      </button>
    </div>
  );
}
