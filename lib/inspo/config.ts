export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value || null;
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID?.trim() || process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function notionConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN?.trim() && process.env.NOTION_DATABASE_ID?.trim());
}

/** Production, and any environment that already has a database, must be fully configured. */
export function storageProblems(): string[] {
  const durable = isProduction() || Boolean(databaseUrl());
  if (!durable) return [];
  const missing: string[] = [];
  if (!databaseUrl()) missing.push("DATABASE_URL");
  if (!blobConfigured()) missing.push("BLOB_STORE_ID o BLOB_READ_WRITE_TOKEN");
  if (!process.env.NOTION_TOKEN?.trim()) missing.push("NOTION_TOKEN");
  if (!process.env.NOTION_DATABASE_ID?.trim()) missing.push("NOTION_DATABASE_ID");
  return missing;
}
