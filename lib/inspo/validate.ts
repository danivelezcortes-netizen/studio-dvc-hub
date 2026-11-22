import { ADDED_BY, FRAMES, ITEM_TYPES, PILLARS, SOURCES, STATUSES, type ItemInput } from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("El cuerpo tiene que ser un objeto.");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bounded(value: string, max: number, label: string): string {
  if (value.length > max) throw new Error(`${label} pasa de ${max} caracteres.`);
  return value;
}

function httpUrl(value: string, label: string): string {
  if (!value) return "";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} no es una URL válida.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} tiene que ser http o https.`);
  }
  return value;
}

const RECORD_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function assertRecordId(id: string) {
  if (!RECORD_ID.test(id)) throw new Error("No está en el tablero.");
}

function oneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${label} no es válido.`);
}

export function parseItemInput(value: unknown): ItemInput {
  const body = asRecord(value);
  const title = bounded(text(body.title), 180, "El título");
  if (!title) throw new Error("Falta el título.");
  const type = oneOf(text(body.type), ITEM_TYPES, "El tipo");
  const source = oneOf(text(body.source), SOURCES, "La fuente");
  const addedBy = oneOf(text(body.addedBy) || "Daniela", ADDED_BY, "Quién lo agregó");
  const pillarRaw = text(body.pillar);
  const statusRaw = text(body.status);
  const savedAt = text(body.savedAt) || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(savedAt)) throw new Error("La fecha guardada no es válida.");
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => bounded(text(tag), 40, "Una etiqueta")).filter(Boolean) : [];
  if (tags.length > 20) throw new Error("Hay demasiadas etiquetas.");
  const sourceUrl = httpUrl(text(body.sourceUrl), "El enlace");
  const account = bounded(text(body.account), 120, "La cuenta");
  const origin = bounded(text(body.origin), 200, "El origen");
  if (!sourceUrl && !account && !origin) {
    throw new Error("Cada referencia necesita cuenta, enlace u origen.");
  }
  const frameRaw = text(body.frame);
  const notes = Array.isArray(body.notes) ? body.notes.map((note) => bounded(text(note), 4000, "Una nota")).filter(Boolean) : [];
  if (notes.length > 20) throw new Error("Hay demasiadas notas.");
  const externalId = text(body.externalId);
  if (externalId && !RECORD_ID.test(externalId)) throw new Error("El identificador externo no es válido.");
  return {
    title,
    type,
    tags,
    pillar: pillarRaw ? oneOf(pillarRaw, PILLARS, "El pilar") : "",
    status: statusRaw ? oneOf(statusRaw, STATUSES, "El estado") : "",
    source,
    sourceUrl,
    account,
    origin,
    addedBy,
    savedAt: savedAt.slice(0, 10),
    imageUrl: httpUrl(text(body.imageUrl), "La imagen"),
    driveUrl: httpUrl(text(body.driveUrl), "Drive"),
    notionUrl: httpUrl(text(body.notionUrl), "Notion"),
    howToUse: bounded(text(body.howToUse), 2000, "Cómo usarlo"),
    sound: bounded(text(body.sound), 200, "El sonido"),
    frame: frameRaw ? oneOf(frameRaw, FRAMES, "La captura") : null,
    externalId,
    addToWeek: body.addToWeek === true,
    notes,
  };
}

export function parseNoteText(value: unknown): string {
  const body = asRecord(value);
  const note = bounded(text(body.text), 4000, "La nota");
  if (!note) throw new Error("La nota está vacía.");
  return note;
}

export function parseWeekAction(value: unknown): { action: "rollover" | "clear"; weekKey: string } {
  const body = asRecord(value);
  const action = text(body.action);
  if (action !== "rollover" && action !== "clear") throw new Error("Esa acción de semana no existe.");
  return { action, weekKey: weekKey(text(body.weekKey)) };
}

export function parseUsed(value: unknown): { weekKey: string; used: boolean } {
  const body = asRecord(value);
  if (typeof body.used !== "boolean") throw new Error("Falta decir si se usó.");
  return { weekKey: weekKey(text(body.weekKey)), used: body.used };
}

function weekKey(value: string): string {
  if (!/^\d{4}-W\d{2}$/.test(value)) throw new Error("La semana no es válida.");
  return value;
}
