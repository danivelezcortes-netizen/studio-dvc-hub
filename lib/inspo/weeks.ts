import type { InspoItem, WeekRecord } from "./types";

export function isoWeekKey(input: Date | string): string {
  const source = typeof input === "string" ? new Date(input) : input;
  const date = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekMonday(weekKey: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return new Date(NaN);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7);
  return monday;
}

export function shiftWeek(weekKey: string, by: number): string {
  const monday = weekMonday(weekKey);
  monday.setUTCDate(monday.getUTCDate() + by * 7);
  return isoWeekKey(monday.toISOString());
}

export function weekRangeLabel(weekKey: string): string {
  const start = weekMonday(weekKey);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function formatSavedDay(savedAt: string): string {
  const date = new Date(`${savedAt.slice(0, 10)}T12:00:00Z`);
  const formatted = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  return formatted.replace(",", "");
}

export function formatStamp(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isNewItem(savedAt: string, nowIso: string): boolean {
  const saved = new Date(`${savedAt.slice(0, 10)}T12:00:00Z`).getTime();
  const now = new Date(nowIso).getTime();
  const age = now - saved;
  return age >= -86400000 && age <= 7 * 86400000;
}

export type WeekEntry = {
  item: InspoItem;
  used: boolean;
  usedAt: string | null;
  archived: boolean;
};

export function entriesForWeek(items: InspoItem[], weekKey: string): WeekEntry[] {
  const entries: WeekEntry[] = [];
  for (const item of items) {
    if (item.weekKey === weekKey) {
      entries.push({ item, used: item.used, usedAt: item.usedAt, archived: false });
      continue;
    }
    const past = item.history.find((record) => record.weekKey === weekKey);
    if (past) entries.push({ item, used: past.used, usedAt: past.usedAt, archived: true });
  }
  return entries.sort((a, b) => b.item.savedAt.localeCompare(a.item.savedAt));
}

export function knownWeeks(items: InspoItem[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.weekKey) keys.add(item.weekKey);
    for (const record of item.history) keys.add(record.weekKey);
  }
  return [...keys].sort().reverse();
}

function pushHistory(item: InspoItem, record: WeekRecord) {
  item.history = item.history.filter((entry) => entry.weekKey !== record.weekKey);
  item.history.push(record);
}

export function toggleHeart(item: InspoItem, currentWeek: string): InspoItem {
  const next = structuredClone(item);
  if (next.weekKey === currentWeek) {
    if (next.used) {
      pushHistory(next, { weekKey: currentWeek, used: true, usedAt: next.usedAt });
    }
    next.weekKey = null;
    next.used = false;
    next.usedAt = null;
    return next;
  }
  if (next.weekKey) {
    pushHistory(next, { weekKey: next.weekKey, used: next.used, usedAt: next.usedAt });
  }
  next.weekKey = currentWeek;
  next.used = false;
  next.usedAt = null;
  return next;
}

export function setUsedFlag(item: InspoItem, weekKey: string, used: boolean, nowIso: string): InspoItem {
  const next = structuredClone(item);
  const usedAt = used ? nowIso : null;
  if (next.weekKey === weekKey) {
    next.used = used;
    next.usedAt = usedAt;
    if (used && next.type === "hook" && next.status !== "Maybe") next.status = "Usada";
    return next;
  }
  const record = next.history.find((entry) => entry.weekKey === weekKey);
  if (record) {
    record.used = used;
    record.usedAt = usedAt;
  }
  return next;
}

export function rolloverPending(items: InspoItem[], fromWeek: string, toWeek: string): InspoItem[] {
  return items.map((item) => {
    if (item.weekKey === fromWeek && !item.used) return { ...item, weekKey: toWeek };
    return item;
  });
}

export function clearPending(items: InspoItem[], weekKey: string): InspoItem[] {
  return items.map((item) => {
    if (item.weekKey === weekKey && !item.used) return { ...item, weekKey: null, used: false, usedAt: null };
    return item;
  });
}

export function countWeek(items: InspoItem[], weekKey: string): number {
  return items.filter((item) => item.weekKey === weekKey).length;
}
