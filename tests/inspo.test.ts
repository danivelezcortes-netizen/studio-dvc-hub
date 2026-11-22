import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { passwordsMatch } from "../lib/auth";
import { filterItems } from "../lib/inspo/filters";
import { clearPending, isoWeekKey, rolloverPending, toggleHeart } from "../lib/inspo/weeks";
import type { InspoItem } from "../lib/inspo/types";

describe("semanas", () => {
  it("agrupa del lunes al domingo", () => {
    expect(isoWeekKey("2026-11-16T12:00:00Z")).toBe("2026-W47");
    expect(isoWeekKey("2026-11-22T12:00:00Z")).toBe("2026-W47");
    expect(isoWeekKey("2026-11-23T12:00:00Z")).toBe("2026-W48");
    expect(isoWeekKey("2026-11-09T12:00:00Z")).toBe("2026-W46");
  });

  it("pasa solo los pendientes y vacía sin tocar las usadas", () => {
    const items = [
      base({ id: "a", weekKey: "2026-W47", used: false }),
      base({ id: "b", weekKey: "2026-W47", used: true }),
    ];
    const rolled = rolloverPending(items, "2026-W47", "2026-W48");
    expect(rolled.find((item) => item.id === "a")?.weekKey).toBe("2026-W48");
    expect(rolled.find((item) => item.id === "b")?.weekKey).toBe("2026-W47");
    const cleared = clearPending(items, "2026-W47");
    expect(cleared.find((item) => item.id === "a")?.weekKey).toBeNull();
    expect(cleared.find((item) => item.id === "b")?.used).toBe(true);
  });

  it("el corazón de esta semana se puede quitar", () => {
    const item = base({ id: "a", weekKey: "2026-W47", used: false });
    expect(toggleHeart(item, "2026-W47").weekKey).toBeNull();
    const again = toggleHeart(base({ id: "a", weekKey: null }), "2026-W47");
    expect(again.weekKey).toBe("2026-W47");
    expect(again.used).toBe(false);
  });
});

describe("filtros", () => {
  it("el estado Maybe deja fuera los otros hooks", () => {
    const items = [
      base({ id: "a", type: "hook", status: "Maybe", title: "me doing everything but ___" }),
      base({ id: "b", type: "hook", status: "Lista", title: "___ is the main character" }),
    ];
    const found = filterItems(items, {
      query: "",
      tags: [],
      source: "",
      type: "",
      hooksOnly: true,
      status: "Maybe",
      pillar: "",
      withShot: false,
      addedBy: "",
    });
    expect(found.map((item) => item.id)).toEqual(["a"]);
  });
});

describe("contraseña", () => {
  it("compara sin aceptar un prefijo", () => {
    expect(passwordsMatch("orquidea", "orquidea")).toBe(true);
    expect(passwordsMatch("orquidea", "orquideas")).toBe(false);
    expect(passwordsMatch("", "orquidea")).toBe(false);
  });
});

describe("archivo", () => {
  let dir = "";
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DATABASE_ID;
  });

  it("guarda, anota, marca el corazón y borra", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "dvc-"));
    process.env.DATA_DIR = dir;
    const { getStore, resetStoreForTests } = await import("../lib/inspo/store");
    resetStoreForTests();
    const store = getStore();
    const seeded = await store.load();
    expect(seeded.items.length).toBeGreaterThan(10);
    expect(seeded.storage).toBe("file");
    const created = await store.create({
      title: "Prueba de mesa",
      type: "detalle",
      tags: ["Making"],
      pillar: "Making",
      status: "",
      source: "Manual",
      sourceUrl: "",
      account: "Daniela",
      origin: "Taller",
      addedBy: "Daniela",
      savedAt: "2026-11-22",
      driveUrl: "",
      notionUrl: "",
      howToUse: "Mirar la luz.",
      sound: "",
      addToWeek: true,
    });
    expect(created.weekKey).toBe("2026-W47");
    const noted = await store.addNote(created.id, "La luz entra a las cuatro.");
    expect(noted.notes).toHaveLength(1);
    const edited = await store.updateNote(created.id, noted.notes[0].id, "La luz entra a las cinco.");
    expect(edited.notes[0].text).toContain("cinco");
    expect(edited.notes[0].updatedAt).not.toBe(edited.notes[0].createdAt);
    await store.remove(created.id);
    const after = await store.load();
    expect(after.items.find((item) => item.id === created.id)).toBeUndefined();
  });
});

function base(partial: Partial<InspoItem> & { id: string }): InspoItem {
  return {
    id: partial.id,
    externalId: partial.id,
    title: partial.title ?? partial.id,
    type: partial.type ?? "imagen",
    tags: partial.tags ?? [],
    pillar: partial.pillar ?? "",
    status: partial.status ?? "",
    source: partial.source ?? "Manual",
    sourceUrl: "",
    account: "",
    origin: "",
    addedBy: "Daniela",
    savedAt: "2026-11-18",
    imagePath: null,
    imageUrl: "",
    driveUrl: "",
    notionUrl: "",
    howToUse: "",
    sound: "",
    frame: partial.frame ?? null,
    notes: [],
    weekKey: partial.weekKey ?? null,
    used: partial.used ?? false,
    usedAt: null,
    history: [],
    createdAt: "2026-11-18T10:00:00.000Z",
    updatedAt: "2026-11-18T10:00:00.000Z",
  };
}
