import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { signSession, sessionIsValid } from "../lib/auth";
import { authorizeIngest } from "../lib/inspo/ingest-auth";
import { propertiesToAdd } from "../lib/inspo/notion";
import { createPostgresStore, type Backup } from "../lib/inspo/postgres-store";
import type { Sql } from "../lib/inspo/sql";
import { getStore, resetStoreForTests } from "../lib/inspo/store";
import { memoryGate, resetLoginLimitForTests } from "../lib/login-limit";
import { assertImage, matchesDeclaredType } from "../lib/inspo/media";
import type { PGlite as PGliteType } from "@electric-sql/pglite";

function pgliteSql(db: PGliteType): Sql {
  const adapt = (queryable: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }): Sql => ({
    async query(text, params = []) {
      const result = await queryable.query(text, params);
      return result.rows as Record<string, unknown>[];
    },
    transaction(fn) {
      if (!("transaction" in queryable)) throw new Error("No anides transacciones.");
      return (queryable as PGliteType).transaction((tx) => fn(adapt(tx)));
    },
  });
  return adapt(db);
}

function input(externalId = "ext-1") {
  return {
    title: "Prueba de mesa",
    type: "detalle" as const,
    tags: ["Making"],
    pillar: "Making" as const,
    status: "" as const,
    source: "Manual" as const,
    sourceUrl: "",
    account: "Daniela",
    origin: "Taller",
    addedBy: "Daniela" as const,
    savedAt: "2026-11-22",
    driveUrl: "",
    notionUrl: "",
    howToUse: "Mirar la luz.",
    sound: "",
    addToWeek: true,
    externalId,
  };
}

describe("sesión", () => {
  it("firma la cookie y la rechaza al caducar", async () => {
    const token = await signSession("orquidea", 1_000);
    expect(token.startsWith("v2.")).toBe(true);
    expect(token.includes("orquidea")).toBe(false);
    expect(await sessionIsValid(token, "orquidea", 500)).toBe(true);
    expect(await sessionIsValid(token, "orquidea", 1_000)).toBe(false);
    expect(await sessionIsValid(token, "otra", 500)).toBe(false);
  });
});

describe("ingesta", () => {
  afterEach(() => {
    delete process.env.INGEST_TOKEN;
  });

  it("rechaza si falta el token o no coincide, y avisa si es corto", () => {
    delete process.env.INGEST_TOKEN;
    expect(authorizeIngest("Bearer secreto-largo-de-mas-de-treinta-y-dos")).toMatchObject({ ok: false, status: 401 });
    process.env.INGEST_TOKEN = "corto";
    expect(authorizeIngest(null)).toMatchObject({ ok: false, status: 503 });
    process.env.INGEST_TOKEN = "12345678901234567890123456789012";
    expect(authorizeIngest("Bearer 12345678901234567890123456789012")).toEqual({ ok: true });
    expect(authorizeIngest("Bearer 12345678901234567890123456789012-extra")).toMatchObject({ ok: false, status: 401 });
    expect(authorizeIngest("Basic 12345678901234567890123456789012")).toMatchObject({ ok: false, status: 401 });
  });
});

describe("login", () => {
  afterEach(() => resetLoginLimitForTests());

  it("bloquea al sexto fallo y no abre con la clave buena mientras dura", () => {
    const key = "ip-hash";
    for (let attempt = 0; attempt < 5; attempt += 1) expect(memoryGate(key, false, 1_000)).toBe("ok");
    expect(memoryGate(key, true, 1_000)).toBe("limited");
    expect(memoryGate(key, false, 1_000 + 16 * 60 * 1000)).toBe("ok");
  });
});

describe("imagen", () => {
  it("exige un tipo real y un tamaño", () => {
    expect(() => assertImage("text/plain", 10)).toThrow(/JPG/);
    expect(() => assertImage("image/png", 9 * 1024 * 1024)).toThrow(/8 MB/);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(matchesDeclaredType(png, "image/png")).toBe(true);
    expect(matchesDeclaredType(png, "image/jpeg")).toBe(false);
  });
});

describe("notion", () => {
  it("pide las columnas que faltan y no toca las que ya coinciden", () => {
    const missing = propertiesToAdd({ Name: { type: "title" }, Type: { type: "select" } });
    expect(missing.Type).toBeUndefined();
    expect(missing.Week).toEqual({ rich_text: {} });
    expect(() => propertiesToAdd({ Type: { type: "rich_text" } })).toThrow(/Type/);
  });
});

describe("postgres", () => {
  let db: PGlite | null = null;

  afterEach(async () => {
    await db?.close();
    db = null;
  });

  it("guarda, anota, marca el corazón y conserva el ítem si Notion falla", async () => {
    db = new PGlite();
    const sql = pgliteSql(db);
    let pushes = 0;
    const backup: Backup = {
      async push() {
        pushes += 1;
        if (pushes === 1) throw new Error("Notion no responde.");
        return { pageId: "page-1", url: "https://www.notion.so/page-1" };
      },
      async archive() {
        throw new Error("Notion no archiva.");
      },
    };
    const store = createPostgresStore(sql, backup);
    const created = await store.create(input());
    expect(created.weekKey).toBe("2026-W47");
    const noted = await store.addNote(created.id, "La luz entra a las cuatro.");
    expect(noted.notes).toHaveLength(1);
    const edited = await store.updateNote(created.id, noted.notes[0].id, "La luz entra a las cinco.");
    expect(edited.notes[0].text).toContain("cinco");
    const heart = await store.heart(created.id);
    expect(heart.weekKey).toBeNull();
    const again = await store.create(input());
    expect(again.id).toBe(created.id);
    const board = await store.load();
    expect(board.storage).toBe("postgres");
    expect(board.items).toHaveLength(1);
    expect(board.backup).toBe("ok");
    expect(board.items[0].notionUrl).toContain("notion.so");
    await store.remove(created.id);
    const after = await store.load();
    expect(after.items).toHaveLength(0);
    expect(after.backup).toBe("pending");
  });
});

describe("producción", () => {
  const previous = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = previous;
    delete process.env.DATABASE_URL;
    delete process.env.BLOB_STORE_ID;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DATABASE_ID;
    resetStoreForTests();
  });

  it("no abre el archivo local cuando faltan las claves", () => {
    process.env.NODE_ENV = "production";
    resetStoreForTests();
    expect(() => getStore()).toThrow(/DATABASE_URL/);
  });

  it("en local sigue pudiendo usar el archivo", async () => {
    process.env.NODE_ENV = "test";
    const dir = await mkdtemp(path.join(tmpdir(), "dvc-prod-"));
    process.env.DATA_DIR = dir;
    resetStoreForTests();
    const board = await getStore().load();
    expect(board.storage).toBe("file");
    expect(board.backup).toBe("local");
    await rm(dir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
  });
});
