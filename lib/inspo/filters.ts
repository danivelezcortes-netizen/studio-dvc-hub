import { PILLARS, type InspoItem, type Pillar } from "./types";

export type BoardFilters = {
  query: string;
  tags: string[];
  source: string;
  type: string;
  hooksOnly?: boolean;
  status: string;
  pillar: string;
  withShot: boolean;
  addedBy: string;
};

export const EMPTY_FILTERS: BoardFilters = {
  query: "",
  tags: [],
  source: "",
  type: "",
  status: "",
  pillar: "",
  withShot: false,
  addedBy: "",
};

function haystack(item: InspoItem): string {
  return [
    item.title,
    item.account,
    item.origin,
    item.howToUse,
    item.sound,
    item.tags.join(" "),
    item.notes.map((note) => note.text).join(" "),
    item.pillar,
    item.status,
  ]
    .join(" ")
    .toLocaleLowerCase("es");
}

function hasCapture(item: InspoItem): boolean {
  return Boolean(item.imagePath || item.frame);
}

function tagHit(item: InspoItem, tag: string): boolean {
  if ((PILLARS as readonly string[]).includes(tag)) {
    return item.pillar === tag || item.tags.includes(tag);
  }
  if (tag === "Hooks") return item.type === "hook" || item.tags.includes(tag);
  if (tag === "Texto en pantalla") return item.type === "texto" || item.tags.includes(tag);
  if (tag === "Outfits") return item.type === "outfit" || item.tags.includes(tag);
  if (tag === "Handbags") return item.tags.includes("Handbags") || item.tags.includes("Bolsos");
  return item.tags.includes(tag);
}

export function filterItems(items: InspoItem[], filters: BoardFilters): InspoItem[] {
  const query = filters.query.trim().toLocaleLowerCase("es");
  return items.filter((item) => {
    if (filters.hooksOnly && item.type !== "hook") return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.source && item.source !== filters.source) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.pillar && item.pillar !== (filters.pillar as Pillar) && !item.tags.includes(filters.pillar)) {
      return false;
    }
    if (filters.withShot && !hasCapture(item)) return false;
    if (filters.addedBy === "Daniela" && item.addedBy !== "Daniela") return false;
    if (filters.addedBy === "Rutinas" && item.addedBy !== "Rutina IG lunes" && item.addedBy !== "Vogue viernes") return false;
    if (filters.tags.length && !filters.tags.some((tag) => tagHit(item, tag))) return false;
    if (query && !haystack(item).includes(query)) return false;
    return true;
  });
}

export function groupByDay(items: InspoItem[]): { day: string; items: InspoItem[] }[] {
  const sorted = [...items].sort((a, b) => {
    const byDay = b.savedAt.localeCompare(a.savedAt);
    if (byDay !== 0) return byDay;
    return b.createdAt.localeCompare(a.createdAt);
  });
  const groups: { day: string; items: InspoItem[] }[] = [];
  for (const item of sorted) {
    const day = item.savedAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (!last || last.day !== day) groups.push({ day, items: [item] });
    else last.items.push(item);
  }
  return groups;
}
