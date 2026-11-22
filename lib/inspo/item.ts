import "server-only";

import { storeImage, storeImageFromUrl } from "./media";
import { uploadToDrive } from "./drive";
import type { InspoItem, ItemInput, Note } from "./types";
import { isoWeekKey } from "./weeks";

export type ImagePayload = { bytes: Uint8Array; contentType: string; filename: string };

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function buildItem(input: ItemInput, now: string, id = newId()): InspoItem {
  const savedAt = (input.savedAt || now).slice(0, 10);
  const notes: Note[] = (input.notes || [])
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ id: newId(), text, createdAt: now, updatedAt: now }));
  return {
    id,
    externalId: input.externalId?.trim() || id,
    title: input.title.trim(),
    type: input.type,
    tags: [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))],
    pillar: input.pillar || "",
    status: input.status || "",
    source: input.source,
    sourceUrl: input.sourceUrl.trim(),
    account: input.account.trim(),
    origin: input.origin.trim(),
    addedBy: input.addedBy,
    savedAt,
    imagePath: null,
    imageUrl: input.imageUrl?.trim() || "",
    driveUrl: input.driveUrl.trim(),
    notionUrl: input.notionUrl.trim(),
    howToUse: input.howToUse.trim(),
    sound: input.sound.trim(),
    frame: input.frame ?? null,
    notes,
    weekKey: input.addToWeek ? isoWeekKey(now) : null,
    used: false,
    usedAt: null,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function applyInput(item: InspoItem, input: ItemInput, now: string): InspoItem {
  const next = buildItem({ ...input, notes: [] }, now, item.id);
  next.externalId = input.externalId?.trim() || item.externalId;
  next.notes = item.notes;
  next.weekKey = item.weekKey;
  next.used = item.used;
  next.usedAt = item.usedAt;
  next.history = item.history;
  next.imagePath = item.imagePath;
  next.imageUrl = input.imageUrl?.trim() || item.imageUrl;
  next.frame = input.frame === undefined ? item.frame : input.frame;
  next.createdAt = item.createdAt;
  next.updatedAt = now;
  if (input.addToWeek && next.weekKey !== isoWeekKey(now)) {
    next.weekKey = isoWeekKey(now);
    next.used = false;
    next.usedAt = null;
  }
  return next;
}

export async function attachImage(item: InspoItem, image: ImagePayload | null, remoteUrl?: string): Promise<InspoItem> {
  const next = { ...item };
  if (image) {
    const stored = await storeImage(image.bytes, image.contentType, image.filename);
    next.imagePath = stored.imagePath;
    next.frame = null;
    if (!next.driveUrl) {
      const link = await uploadToDrive(image.bytes, image.filename, image.contentType);
      if (link) next.driveUrl = link;
    }
  } else if (remoteUrl && !next.imagePath) {
    const stored = await storeImageFromUrl(remoteUrl);
    next.imagePath = stored.imagePath;
    next.imageUrl = remoteUrl;
  }
  return next;
}
