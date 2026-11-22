import "server-only";

import { archivePage, backupItem } from "./notion";
import { deleteStoredImage } from "./media";
import { applyInput, attachImage, buildItem, newId, nowIso, type ImagePayload } from "./item";
import { ensureSchema } from "./schema";
import { databaseMessage, getSql } from "./db";
import { StorageError } from "./errors";
import type { Sql } from "./sql";
import type { BoardSnapshot, InspoItem, ItemInput, Note, WeekRecord } from "./types";
import { clearPending, isoWeekKey, rolloverPending, setUsedFlag, shiftWeek, toggleHeart } from "./weeks";

const RECORD_ID = /^[A-Za-z0-9_-]{1,80}$/;
const WEEK_KEY = /^\d{4}-W\d{2}$/;

export type Backup = {
  push(item: InspoItem, pageId: string | null): Promise<{ pageId: string; url: string }>;
  archive(pageId: string): Promise<void>;
};

const notionBackup: Backup = {
  push: backupItem,
  archive: archivePage,
};

type ItemRow = {
  id: string;
  external_id: string;
  title: string;
  type: InspoItem["type"];
  tags: string[] | string;
  pillar: InspoItem["pillar"];
  status: InspoItem["status"];
  source: InspoItem["source"];
  source_url: string;
  account: string;
  origin: string;
  added_by: InspoItem["addedBy"];
  saved_at: string | Date;
  image_path: string | null;
  image_url: string;
  drive_url: string;
  notion_url: string;
  notion_page_id: string | null;
  how_to_use: string;
  sound: string;
  frame: InspoItem["frame"];
  week_key: string | null;
  used: boolean | string;
  used_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function assertId(id: string) {
  if (!RECORD_ID.test(id)) throw new StorageError("No está en el tablero.", 404);
}

function assertWeek(weekKey: string) {
  if (!WEEK_KEY.test(weekKey)) throw new Error("La semana no es válida.");
}

function day(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function stamp(value: unknown): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function tagsOf(value: string[] | string): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.startsWith("{")) {
    const inner = value.slice(1, -1);
    if (!inner) return [];
    return inner.split(",").map((tag) => tag.replaceAll('"', ""));
  }
  return [];
}

function flag(value: boolean | string): boolean {
  return value === true || value === "t" || value === "true";
}

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

function mapItem(row: ItemRow, notes: Note[], history: WeekRecord[]): InspoItem {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    type: row.type,
    tags: tagsOf(row.tags),
    pillar: row.pillar || "",
    status: row.status || "",
    source: row.source,
    sourceUrl: row.source_url,
    account: row.account,
    origin: row.origin,
    addedBy: row.added_by,
    savedAt: day(row.saved_at),
    imagePath: row.image_path,
    imageUrl: row.image_url,
    driveUrl: row.drive_url,
    notionUrl: row.notion_url,
    howToUse: row.how_to_use,
    sound: row.sound,
    frame: row.frame,
    notes,
    weekKey: row.week_key,
    used: flag(row.used),
    usedAt: stamp(row.used_at),
    history,
    createdAt: stamp(row.created_at) || nowIso(),
    updatedAt: stamp(row.updated_at) || nowIso(),
  };
}

async function loadAll(sql: Sql): Promise<{ items: InspoItem[]; pages: Map<string, string | null> }> {
  const rows = await sql.query<ItemRow>(
    `select * from inspo_items order by saved_at desc, created_at desc`,
  );
  const ids = rows.map((row) => row.id);
  const notes = ids.length
    ? await sql.query<{ id: string; item_id: string; text: string; created_at: string | Date; updated_at: string | Date }>(
        `select id, item_id, text, created_at, updated_at from inspo_notes where item_id = any($1::text[]) order by created_at`,
        [ids],
      )
    : [];
  const history = ids.length
    ? await sql.query<{ item_id: string; week_key: string; used: boolean | string; used_at: string | Date | null }>(
        `select item_id, week_key, used, used_at from inspo_week_history where item_id = any($1::text[])`,
        [ids],
      )
    : [];
  const notesByItem = new Map<string, Note[]>();
  for (const note of notes) {
    const list = notesByItem.get(note.item_id) ?? [];
    list.push({
      id: note.id,
      text: note.text,
      createdAt: stamp(note.created_at) || nowIso(),
      updatedAt: stamp(note.updated_at) || nowIso(),
    });
    notesByItem.set(note.item_id, list);
  }
  const historyByItem = new Map<string, WeekRecord[]>();
  for (const record of history) {
    const list = historyByItem.get(record.item_id) ?? [];
    list.push({ weekKey: record.week_key, used: flag(record.used), usedAt: stamp(record.used_at) });
    historyByItem.set(record.item_id, list);
  }
  const pages = new Map<string, string | null>();
  const items = rows.map((row) => {
    pages.set(row.id, row.notion_page_id);
    return mapItem(row, notesByItem.get(row.id) ?? [], historyByItem.get(row.id) ?? []);
  });
  return { items, pages };
}

async function saveItem(sql: Sql, item: InspoItem, pageId: string | null) {
  await sql.query(
    `insert into inspo_items (
      id, external_id, title, type, tags, pillar, status, source, source_url, account, origin, added_by,
      saved_at, image_path, image_url, drive_url, notion_url, notion_page_id, how_to_use, sound, frame,
      week_key, used, used_at, created_at, updated_at
    ) values (
      $1,$2,$3,$4,$5::text[],$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    )
    on conflict (id) do update set
      external_id = excluded.external_id,
      title = excluded.title,
      type = excluded.type,
      tags = excluded.tags,
      pillar = excluded.pillar,
      status = excluded.status,
      source = excluded.source,
      source_url = excluded.source_url,
      account = excluded.account,
      origin = excluded.origin,
      added_by = excluded.added_by,
      saved_at = excluded.saved_at,
      image_path = excluded.image_path,
      image_url = excluded.image_url,
      drive_url = excluded.drive_url,
      notion_url = excluded.notion_url,
      notion_page_id = excluded.notion_page_id,
      how_to_use = excluded.how_to_use,
      sound = excluded.sound,
      frame = excluded.frame,
      week_key = excluded.week_key,
      used = excluded.used,
      used_at = excluded.used_at,
      updated_at = excluded.updated_at`,
    [
      item.id,
      item.externalId,
      item.title,
      item.type,
      item.tags,
      item.pillar,
      item.status,
      item.source,
      item.sourceUrl,
      item.account,
      item.origin,
      item.addedBy,
      item.savedAt,
      item.imagePath,
      item.imageUrl,
      item.driveUrl,
      item.notionUrl,
      pageId,
      item.howToUse,
      item.sound,
      item.frame,
      item.weekKey,
      item.used,
      item.usedAt,
      item.createdAt,
      item.updatedAt,
    ],
  );
  await sql.query(`delete from inspo_notes where item_id = $1`, [item.id]);
  for (const note of item.notes) {
    await sql.query(
      `insert into inspo_notes (id, item_id, text, created_at, updated_at) values ($1,$2,$3,$4,$5)`,
      [note.id, item.id, note.text, note.createdAt, note.updatedAt],
    );
  }
  await sql.query(`delete from inspo_week_history where item_id = $1`, [item.id]);
  for (const record of item.history) {
    await sql.query(
      `insert into inspo_week_history (item_id, week_key, used, used_at) values ($1,$2,$3,$4)`,
      [item.id, record.weekKey, record.used, record.usedAt],
    );
  }
}

async function requireItem(sql: Sql, id: string): Promise<{ item: InspoItem; pageId: string | null }> {
  assertId(id);
  const loaded = await loadAll(sql);
  const item = loaded.items.find((entry) => entry.id === id);
  if (!item) throw new StorageError("No está en el tablero.", 404);
  return { item, pageId: loaded.pages.get(id) ?? null };
}

async function enqueue(sql: Sql, itemId: string, op: "upsert" | "archive", pageId: string | null, message: string) {
  await sql.query(`delete from inspo_notion_outbox where item_id = $1 and synced_at is null`, [itemId]);
  await sql.query(
    `insert into inspo_notion_outbox (id, item_id, op, notion_page_id, attempts, last_error) values ($1,$2,$3,$4,1,$5)`,
    [newId(), itemId, op, pageId, message],
  );
}

export function createPostgresStore(sql: Sql, backup: Backup = notionBackup) {
  async function ready() {
    try {
      await ensureSchema(sql);
    } catch (error) {
      throw new StorageError(`No pude preparar la base de datos. ${databaseMessage(error)}`, 503);
    }
  }

  async function push(item: InspoItem, pageId: string | null) {
    try {
      const saved = await backup.push(item, pageId);
      await sql.query(`update inspo_items set notion_page_id = $2, notion_url = $3 where id = $1`, [
        item.id,
        saved.pageId,
        saved.url || item.notionUrl,
      ]);
      await sql.query(`update inspo_notion_outbox set synced_at = now(), last_error = null where item_id = $1 and synced_at is null`, [
        item.id,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Notion no respondió.";
      await enqueue(sql, item.id, "upsert", pageId, message);
    }
  }

  async function snapshot(): Promise<BoardSnapshot> {
    await ready();
    await flush();
    const loaded = await loadAll(sql);
    const pending = await sql.query<{ last_error: string | null }>(
      `select last_error from inspo_notion_outbox where synced_at is null order by created_at desc limit 1`,
    );
    return {
      items: loaded.items,
      now: nowIso(),
      storage: "postgres",
      backup: pending.length ? "pending" : "ok",
      backupError: pending[0]?.last_error || undefined,
    };
  }

  async function flush() {
    const jobs = await sql.query<{ id: string; item_id: string; op: string; notion_page_id: string | null }>(
      `select id, item_id, op, notion_page_id from inspo_notion_outbox where synced_at is null order by created_at limit 5`,
    );
    for (const job of jobs) {
      try {
        if (job.op === "archive") {
          if (job.notion_page_id) await backup.archive(job.notion_page_id);
        } else {
          const loaded = await loadAll(sql);
          const item = loaded.items.find((entry) => entry.id === job.item_id);
          if (!item) {
            await sql.query(`update inspo_notion_outbox set synced_at = now() where id = $1`, [job.id]);
            continue;
          }
          const saved = await backup.push(item, loaded.pages.get(item.id) ?? job.notion_page_id);
          await sql.query(`update inspo_items set notion_page_id = $2, notion_url = $3 where id = $1`, [
            item.id,
            saved.pageId,
            saved.url || item.notionUrl,
          ]);
        }
        await sql.query(`update inspo_notion_outbox set synced_at = now(), last_error = null where id = $1`, [job.id]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Notion no respondió.";
        await sql.query(
          `update inspo_notion_outbox set attempts = attempts + 1, last_error = $2 where id = $1`,
          [job.id, message],
        );
        break;
      }
    }
  }

  async function mutate(id: string, change: (item: InspoItem) => InspoItem | Promise<InspoItem>): Promise<InspoItem> {
    await ready();
    assertId(id);
    const saved = await sql.transaction(async (tx) => {
      await tx.query(`select id from inspo_items where id = $1 for update`, [id]);
      const current = await requireItem(tx, id);
      const next = await change(current.item);
      try {
        await saveItem(tx, next, current.pageId);
      } catch (error) {
        if (isUnique(error)) throw new StorageError("Esa referencia ya existe. Vuelve a intentar.", 409);
        throw new StorageError(`No pude guardar en la base de datos. ${databaseMessage(error)}`, 500);
      }
      return { item: next, pageId: current.pageId };
    });
    await push(saved.item, saved.pageId);
    return saved.item;
  }

  return {
    mode: "postgres" as const,
    load: snapshot,
    async create(input: ItemInput, image?: ImagePayload | null) {
      await ready();
      const now = nowIso();
      let previousPath: string | null = null;
      const saved = await sql.transaction(async (tx) => {
        let item = buildItem(input, now);
        let pageId: string | null = null;
        if (input.externalId) {
          const existingRows = await tx.query<{ id: string }>(
            `select id from inspo_items where external_id = $1 for update`,
            [input.externalId],
          );
          if (existingRows[0]) {
            const current = await requireItem(tx, existingRows[0].id);
            previousPath = current.item.imagePath;
            item = applyInput(current.item, input, now);
            pageId = current.pageId;
          }
        }
        item = await attachImage(item, image ?? null, input.imageUrl);
        try {
          await saveItem(tx, item, pageId);
        } catch (error) {
          if (isUnique(error)) throw new StorageError("Esa referencia ya existe. Vuelve a intentar.", 409);
          throw new StorageError(`No pude guardar en la base de datos. ${databaseMessage(error)}`, 500);
        }
        return { item, pageId };
      });
      if (previousPath && previousPath !== saved.item.imagePath) await deleteStoredImage(previousPath);
      await push(saved.item, saved.pageId);
      return saved.item;
    },
    async update(id: string, input: ItemInput, image?: ImagePayload | null, removeImage?: boolean) {
      let removed: string | null = null;
      const item = await mutate(id, async (current) => {
        let next = applyInput(current, input, nowIso());
        if (removeImage) {
          removed = next.imagePath;
          next.imagePath = null;
          next.frame = null;
          next.imageUrl = "";
        }
        const remote = !image && !removeImage && input.imageUrl && input.imageUrl !== current.imageUrl ? input.imageUrl : undefined;
        const before = next.imagePath;
        next = await attachImage(next, image ?? null, remote);
        if (image && before && before !== next.imagePath) removed = before;
        return next;
      });
      if (removed) await deleteStoredImage(removed);
      return item;
    },
    async remove(id: string) {
      await ready();
      assertId(id);
      const removed = await sql.transaction(async (tx) => {
        const current = await requireItem(tx, id);
        await tx.query(`delete from inspo_items where id = $1`, [id]);
        return current;
      });
      try {
        if (removed.pageId) await backup.archive(removed.pageId);
        else await sql.query(`update inspo_notion_outbox set synced_at = now() where item_id = $1 and synced_at is null`, [id]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Notion no respondió.";
        await enqueue(sql, id, "archive", removed.pageId, message);
      }
      if (removed.item.imagePath) await deleteStoredImage(removed.item.imagePath);
    },
    addNote(id: string, text: string) {
      return mutate(id, (current) => {
        const now = nowIso();
        const note: Note = { id: newId(), text: text.trim(), createdAt: now, updatedAt: now };
        return { ...current, notes: [...current.notes, note], updatedAt: now };
      });
    },
    updateNote(id: string, noteId: string, text: string) {
      return mutate(id, (current) => {
        if (!current.notes.some((note) => note.id === noteId)) throw new StorageError("Esa nota no está.", 404);
        const now = nowIso();
        return {
          ...current,
          notes: current.notes.map((note) => (note.id === noteId ? { ...note, text: text.trim(), updatedAt: now } : note)),
          updatedAt: now,
        };
      });
    },
    heart(id: string) {
      return mutate(id, (current) => ({ ...toggleHeart(current, isoWeekKey(nowIso())), updatedAt: nowIso() }));
    },
    markUsed(id: string, weekKey: string, used: boolean) {
      assertWeek(weekKey);
      return mutate(id, (current) => ({ ...setUsedFlag(current, weekKey, used, nowIso()), updatedAt: nowIso() }));
    },
    async rollover(weekKey: string) {
      assertWeek(weekKey);
      await ready();
      const nextWeek = shiftWeek(weekKey, 1);
      const changed = await sql.transaction(async (tx) => {
        const loaded = await loadAll(tx);
        const items = rolloverPending(loaded.items, weekKey, nextWeek);
        const touched = items.filter((item, index) => item.weekKey !== loaded.items[index]?.weekKey);
        for (const item of touched) {
          const pageId = loaded.pages.get(item.id) ?? null;
          await saveItem(tx, { ...item, updatedAt: nowIso() }, pageId);
        }
        return touched.map((item) => ({ item, pageId: loaded.pages.get(item.id) ?? null }));
      });
      for (const entry of changed) await push(entry.item, entry.pageId);
      return snapshot();
    },
    async clearWeek(weekKey: string) {
      assertWeek(weekKey);
      await ready();
      const changed = await sql.transaction(async (tx) => {
        const loaded = await loadAll(tx);
        const items = clearPending(loaded.items, weekKey);
        const touched: { item: InspoItem; pageId: string | null }[] = [];
        for (const item of items) {
          const previous = loaded.items.find((entry) => entry.id === item.id);
          if (previous && previous.weekKey !== item.weekKey) {
            const pageId = loaded.pages.get(item.id) ?? null;
            const next = { ...item, updatedAt: nowIso() };
            await saveItem(tx, next, pageId);
            touched.push({ item: next, pageId });
          }
        }
        return touched;
      });
      for (const entry of changed) await push(entry.item, entry.pageId);
      return snapshot();
    },
  };
}

export function postgresStore() {
  return createPostgresStore(getSql());
}
