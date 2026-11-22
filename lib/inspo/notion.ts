import "server-only";

import { ADDED_BY, FRAMES, ITEM_TYPES, PILLARS, SOURCES, STATUSES, type InspoItem, type Note } from "./types";

const VERSION = "2026-03-11";

type NotionProperty = Record<string, unknown>;
type SchemaProperty = { type?: string; name?: string };

const SCHEMA: Record<string, NotionProperty> = {
  Type: { select: { options: ITEM_TYPES.map((name) => ({ name })) } },
  Tags: { multi_select: {} },
  Pillar: { select: { options: PILLARS.map((name) => ({ name })) } },
  Status: { select: { options: STATUSES.map((name) => ({ name })) } },
  Source: { select: { options: SOURCES.map((name) => ({ name })) } },
  "Source URL": { url: {} },
  Account: { rich_text: {} },
  Origin: { rich_text: {} },
  "Added by": { select: { options: ADDED_BY.map((name) => ({ name })) } },
  "Saved at": { date: {} },
  "Remote image": { url: {} },
  "Drive URL": { url: {} },
  "How to use": { rich_text: {} },
  Sound: { rich_text: {} },
  "External ID": { rich_text: {} },
  Week: { rich_text: {} },
  Used: { checkbox: {} },
  "Used at": { date: {} },
  Frame: { select: { options: FRAMES.map((name) => ({ name })) } },
  History: { rich_text: {} },
};

let schemaPromise: Promise<{ dataSourceId: string; titleName: string }> | null = null;
let lastCall = 0;

function token(): string {
  const value = process.env.NOTION_TOKEN?.trim();
  if (!value) throw new Error("Falta NOTION_TOKEN.");
  return value;
}

function databaseId(): string {
  const value = process.env.NOTION_DATABASE_ID?.trim().replaceAll("-", "");
  if (!value) throw new Error("Falta NOTION_DATABASE_ID.");
  return value;
}

function notionMessage(body: { message?: string }, status: number): string {
  return body.message || `Notion respondió ${status}.`;
}

async function pace() {
  const wait = lastCall + 350 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCall = Date.now();
}

async function notion(path: string, init?: RequestInit, attempt = 0): Promise<unknown> {
  await pace();
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (response.status === 429 && attempt < 2) {
    const retry = Number(response.headers.get("retry-after") || 1);
    await new Promise((resolve) => setTimeout(resolve, Math.min(retry, 5) * 1000));
    return notion(path, init, attempt + 1);
  }
  if (!response.ok) throw new Error(notionMessage(body, response.status));
  return body;
}

function richChunks(content: string) {
  const chunks = [];
  for (let index = 0; index < content.length && chunks.length < 100; index += 1900) {
    chunks.push({ type: "text", text: { content: content.slice(index, index + 1900) } });
  }
  return chunks;
}

function rich(content: string): NotionProperty {
  return { rich_text: richChunks(content) };
}

function absoluteUrl(value: string): string | null {
  return /^https?:\/\//i.test(value) ? value : null;
}

export function propertiesOf(item: InspoItem, titleName: string): Record<string, NotionProperty> {
  return {
    [titleName]: { title: [{ type: "text", text: { content: (item.title || "Sin título").slice(0, 1900) } }] },
    Type: { select: item.type ? { name: item.type } : null },
    Tags: { multi_select: item.tags.slice(0, 20).map((name) => ({ name: name.slice(0, 100) })) },
    Pillar: { select: item.pillar ? { name: item.pillar } : null },
    Status: { select: item.status ? { name: item.status } : null },
    Source: { select: { name: item.source } },
    "Source URL": { url: absoluteUrl(item.sourceUrl) },
    Account: rich(item.account),
    Origin: rich(item.origin),
    "Added by": { select: { name: item.addedBy } },
    "Saved at": { date: item.savedAt ? { start: item.savedAt.slice(0, 10) } : null },
    "Remote image": { url: absoluteUrl(item.imageUrl) },
    "Drive URL": { url: absoluteUrl(item.driveUrl) },
    "How to use": rich(item.howToUse),
    Sound: rich(item.sound),
    "External ID": rich(item.externalId),
    Week: rich(item.weekKey ?? ""),
    Used: { checkbox: item.used },
    "Used at": { date: item.usedAt ? { start: item.usedAt } : null },
    Frame: { select: item.frame ? { name: item.frame } : null },
    History: rich(JSON.stringify(item.history)),
  };
}

export function propertiesToAdd(existing: Record<string, SchemaProperty>): Record<string, NotionProperty> {
  const missing: Record<string, NotionProperty> = {};
  for (const [name, definition] of Object.entries(SCHEMA)) {
    const current = existing[name];
    if (!current) {
      missing[name] = definition;
      continue;
    }
    const expected = Object.keys(definition)[0];
    if (current.type !== expected) {
      throw new Error(`La propiedad «${name}» de Notion es ${current.type || "desconocida"} y tiene que ser ${expected}.`);
    }
  }
  return missing;
}

async function resolveSource(): Promise<{ dataSourceId: string; titleName: string }> {
  if (!schemaPromise) schemaPromise = loadSource().catch((error: unknown) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function loadSource(): Promise<{ dataSourceId: string; titleName: string }> {
  const id = databaseId();
  let dataSourceId = id;
  const database = (await notion(`/databases/${id}`).catch(() => null)) as { data_sources?: { id: string }[] } | null;
  if (database?.data_sources?.length) dataSourceId = database.data_sources[0].id.replaceAll("-", "");
  const source = (await notion(`/data_sources/${dataSourceId}`)) as { properties?: Record<string, SchemaProperty> };
  const properties = source.properties || {};
  const title = Object.entries(properties).find(([, property]) => property.type === "title");
  if (!title) throw new Error("La base de Notion no tiene una propiedad de título.");
  const missing = propertiesToAdd(properties);
  if (Object.keys(missing).length) {
    await notion(`/data_sources/${dataSourceId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: missing }),
    });
  }
  return { dataSourceId, titleName: title[0] };
}

async function writeNotes(pageId: string, notes: Note[]) {
  const existing = (await notion(`/blocks/${pageId}/children?page_size=100`)) as {
    results: { id: string; type: string; paragraph?: { rich_text: { plain_text: string }[] } }[];
  };
  for (const block of existing.results) {
    const content = block.paragraph?.rich_text?.map((chunk) => chunk.plain_text).join("") || "";
    if (content.startsWith("[[note]]")) await notion(`/blocks/${block.id}`, { method: "DELETE" });
  }
  if (!notes.length) return;
  await notion(`/blocks/${pageId}/children`, {
    method: "PATCH",
    body: JSON.stringify({
      children: notes.map((entry) => ({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: richChunks(`[[note]]${JSON.stringify(entry)}`) },
      })),
    }),
  });
}

export async function backupItem(item: InspoItem, pageId: string | null): Promise<{ pageId: string; url: string }> {
  const source = await resolveSource();
  const properties = propertiesOf(item, source.titleName);
  if (!pageId) {
    const page = (await notion("/pages", {
      method: "POST",
      body: JSON.stringify({ parent: { data_source_id: source.dataSourceId }, properties }),
    })) as { id: string; url: string };
    if (item.notes.length) await writeNotes(page.id, item.notes);
    return { pageId: page.id, url: page.url };
  }
  const page = (await notion(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  })) as { id: string; url: string };
  await writeNotes(pageId, item.notes);
  return { pageId: page.id, url: page.url };
}

export async function archivePage(pageId: string): Promise<void> {
  await notion(`/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ archived: true }) });
}

export function resetNotionForTests() {
  schemaPromise = null;
}
