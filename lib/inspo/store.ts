import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { storageProblems, databaseUrl } from "./config";
import { StorageError } from "./errors";
import { applyInput, attachImage, buildItem, newId, nowIso, type ImagePayload } from "./item";
import { postgresStore } from "./postgres-store";
import { seedItems } from "./seed";
import type { BoardSnapshot, InspoItem, ItemInput, Note } from "./types";
import { clearPending, isoWeekKey, rolloverPending, setUsedFlag, shiftWeek, toggleHeart } from "./weeks";

export type { ImagePayload };
export { buildItem };

function dataFile(): string {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dir, "board.json");
}

function localBoard(items: InspoItem[]): BoardSnapshot {
  return { items, now: nowIso(), storage: "file", backup: "local" };
}

type Store = {
  mode: "file" | "postgres";
  load(): Promise<BoardSnapshot>;
  create(input: ItemInput, image?: ImagePayload | null): Promise<InspoItem>;
  update(id: string, input: ItemInput, image?: ImagePayload | null, removeImage?: boolean): Promise<InspoItem>;
  remove(id: string): Promise<void>;
  addNote(id: string, text: string): Promise<InspoItem>;
  updateNote(id: string, noteId: string, text: string): Promise<InspoItem>;
  heart(id: string): Promise<InspoItem>;
  markUsed(id: string, weekKey: string, used: boolean): Promise<InspoItem>;
  rollover(weekKey: string): Promise<BoardSnapshot>;
  clearWeek(weekKey: string): Promise<BoardSnapshot>;
};

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  locks.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function fileStore(): Store {
  const file = dataFile();
  async function read(): Promise<InspoItem[]> {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as { items: InspoItem[] };
      return parsed.items;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const items = seedItems();
      await write(items);
      return items;
    }
  }
  async function write(items: InspoItem[]) {
    if (process.env.NODE_ENV === "production") {
      throw new StorageError("En producción Inspo no escribe un archivo local.", 503);
    }
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify({ items }, null, 2));
    const { rename } = await import("node:fs/promises");
    await rename(temporary, file);
  }
  function requireItem(items: InspoItem[], id: string): InspoItem {
    const item = items.find((entry) => entry.id === id);
    if (!item) throw new Error("No está en el tablero.");
    return item;
  }
  return {
    mode: "file",
    load: () => withLock(file, async () => localBoard(await read())),
    create: (input, image) =>
      withLock(file, async () => {
        const items = await read();
        const now = nowIso();
        if (input.externalId) {
          const existing = items.find((entry) => entry.externalId === input.externalId);
          if (existing) {
            let next = applyInput(existing, input, now);
            next = await attachImage(next, image ?? null, input.imageUrl);
            const index = items.findIndex((entry) => entry.id === existing.id);
            items[index] = next;
            await write(items);
            return next;
          }
        }
        let item = buildItem(input, now);
        item = await attachImage(item, image ?? null, input.imageUrl);
        items.unshift(item);
        await write(items);
        return item;
      }),
    update: (id, input, image, removeImage) =>
      withLock(file, async () => {
        const items = await read();
        const current = requireItem(items, id);
        let next = applyInput(current, input, nowIso());
        if (removeImage) {
          next.imagePath = null;
          next.frame = null;
          next.imageUrl = "";
        }
        const remote = !image && !removeImage && input.imageUrl && input.imageUrl !== current.imageUrl ? input.imageUrl : undefined;
        next = await attachImage(next, image ?? null, remote);
        const index = items.findIndex((entry) => entry.id === id);
        items[index] = next;
        await write(items);
        return next;
      }),
    remove: (id) =>
      withLock(file, async () => {
        const items = await read();
        requireItem(items, id);
        await write(items.filter((entry) => entry.id !== id));
      }),
    addNote: (id, text) =>
      withLock(file, async () => {
        const items = await read();
        const current = requireItem(items, id);
        const now = nowIso();
        const note: Note = { id: newId(), text: text.trim(), createdAt: now, updatedAt: now };
        const next = { ...current, notes: [...current.notes, note], updatedAt: now };
        items[items.findIndex((entry) => entry.id === id)] = next;
        await write(items);
        return next;
      }),
    updateNote: (id, noteId, text) =>
      withLock(file, async () => {
        const items = await read();
        const current = requireItem(items, id);
        const now = nowIso();
        const notes = current.notes.map((note) => (note.id === noteId ? { ...note, text: text.trim(), updatedAt: now } : note));
        if (!notes.some((note) => note.id === noteId)) throw new Error("Esa nota no está.");
        const next = { ...current, notes, updatedAt: now };
        items[items.findIndex((entry) => entry.id === id)] = next;
        await write(items);
        return next;
      }),
    heart: (id) =>
      withLock(file, async () => {
        const items = await read();
        const current = requireItem(items, id);
        const next = { ...toggleHeart(current, isoWeekKey(nowIso())), updatedAt: nowIso() };
        items[items.findIndex((entry) => entry.id === id)] = next;
        await write(items);
        return next;
      }),
    markUsed: (id, weekKey, used) =>
      withLock(file, async () => {
        const items = await read();
        const current = requireItem(items, id);
        const next = { ...setUsedFlag(current, weekKey, used, nowIso()), updatedAt: nowIso() };
        items[items.findIndex((entry) => entry.id === id)] = next;
        await write(items);
        return next;
      }),
    rollover: (weekKey) =>
      withLock(file, async () => {
        const items = rolloverPending(await read(), weekKey, shiftWeek(weekKey, 1));
        await write(items);
        return localBoard(items);
      }),
    clearWeek: (weekKey) =>
      withLock(file, async () => {
        const items = clearPending(await read(), weekKey);
        await write(items);
        return localBoard(items);
      }),
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  const problems = storageProblems();
  if (problems.length) {
    throw new StorageError(`Inspo no puede guardar todavía. Falta: ${problems.join(", ")}.`, 503);
  }
  const mode = databaseUrl() ? "postgres" : "file";
  if (!cached || cached.mode !== mode) cached = mode === "postgres" ? postgresStore() : fileStore();
  return cached;
}

export function resetStoreForTests() {
  cached = null;
}
