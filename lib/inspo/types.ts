export const ITEM_TYPES = ["imagen", "hook", "outfit", "detalle", "texto"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const SOURCES = ["Instagram", "Vogue", "Pinterest", "Drive", "Manual", "Otro"] as const;
export type SourceKind = (typeof SOURCES)[number];

export const PILLARS = ["Making", "Hunt", "Eye", "Life"] as const;
export type Pillar = (typeof PILLARS)[number];

export const STATUSES = ["Lista", "Maybe", "Usada", "Pendiente"] as const;
export type HookStatus = (typeof STATUSES)[number];

export const ADDED_BY = ["Daniela", "Rutina IG lunes", "Vogue viernes", "Manual"] as const;
export type AddedBy = (typeof ADDED_BY)[number];

export const FRAMES = [
  "sophie",
  "linda",
  "howrad",
  "dario",
  "lart",
  "intocarry",
  "mnera",
  "soulful",
  "zeopatra",
] as const;
export type FrameKind = (typeof FRAMES)[number];

export type Note = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type WeekRecord = {
  weekKey: string;
  used: boolean;
  usedAt: string | null;
};

export type InspoItem = {
  id: string;
  externalId: string;
  title: string;
  type: ItemType;
  tags: string[];
  pillar: Pillar | "";
  status: HookStatus | "";
  source: SourceKind;
  sourceUrl: string;
  account: string;
  origin: string;
  addedBy: AddedBy;
  savedAt: string;
  imagePath: string | null;
  imageUrl: string;
  driveUrl: string;
  notionUrl: string;
  howToUse: string;
  sound: string;
  frame: FrameKind | null;
  notes: Note[];
  weekKey: string | null;
  used: boolean;
  usedAt: string | null;
  history: WeekRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ItemInput = {
  title: string;
  type: ItemType;
  tags: string[];
  pillar: Pillar | "";
  status: HookStatus | "";
  source: SourceKind;
  sourceUrl: string;
  account: string;
  origin: string;
  addedBy: AddedBy;
  savedAt: string;
  imageUrl?: string;
  driveUrl: string;
  notionUrl: string;
  howToUse: string;
  sound: string;
  frame?: FrameKind | null;
  externalId?: string;
  addToWeek?: boolean;
  notes?: string[];
};

export type BoardSnapshot = {
  items: InspoItem[];
  now: string;
  storage: "file" | "postgres";
  backup: "local" | "ok" | "pending";
  backupError?: string;
};

export const CHIP_TAGS = [
  "Handbags",
  "Outfits",
  "Hooks",
  "Trends",
  "Sonidos",
  "Texto en pantalla",
  "Making",
  "Hunt",
  "Eye",
  "Life",
  "Flores",
  "Bolsos",
  "Encaje",
  "La Trouvaille",
] as const;

export const TYPE_LABEL: Record<ItemType, string> = {
  imagen: "Imagen",
  hook: "Hook",
  outfit: "Outfit",
  detalle: "Detalle",
  texto: "Texto en pantalla",
};

export const PILLAR_LABEL: Record<Pillar, string> = {
  Making: "The making",
  Hunt: "The hunt",
  Eye: "The eye",
  Life: "The life",
};

export const PILLAR_COLOR: Record<Pillar, string> = {
  Making: "#E7D52B",
  Hunt: "#FF5A1F",
  Eye: "#1565FF",
  Life: "#FF2D9A",
};

export const STATUS_COLOR: Record<HookStatus, string> = {
  Lista: "#00B85C",
  Maybe: "#FF8C00",
  Usada: "#161216",
  Pendiente: "#FF8C00",
};

export function statusInk(status: HookStatus): string {
  return status === "Usada" ? "#FFFFFF" : "#161216";
}

export function pillarInk(pillar: Pillar): string {
  return pillar === "Eye" || pillar === "Life" ? "#FFFFFF" : "#161216";
}
