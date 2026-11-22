import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { blobConfigured, isProduction } from "./config";
import { StorageError } from "./errors";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type StoredImage = {
  imagePath: string;
  contentType: string;
};

export function uploadsDir(): string {
  return path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "uploads");
}

export function extensionFor(contentType: string): string | null {
  return TYPES.get(contentType.toLowerCase()) ?? null;
}

export function assertImage(contentType: string, size: number) {
  if (size <= 0) throw new Error("La imagen está vacía.");
  if (!extensionFor(contentType)) throw new Error("La imagen tiene que ser JPG, PNG, WEBP o GIF.");
  if (size > MAX_BYTES) throw new Error("La imagen pasa de 8 MB.");
}

export function matchesDeclaredType(bytes: Uint8Array, contentType: string): boolean {
  const type = contentType.toLowerCase();
  if (bytes.byteLength < 12) return false;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg" || type === "image/jpg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/gif") return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  if (type === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

export function blobPathname(imagePath: string | null): string | null {
  if (!imagePath?.startsWith("/api/inspo/media/")) return null;
  const pathname = decodeURIComponent(imagePath.slice("/api/inspo/media/".length));
  if (!/^inspo\/[A-Za-z0-9._-]+$/.test(pathname)) return null;
  return pathname;
}

export async function storeImage(bytes: Uint8Array, contentType: string, hint: string): Promise<StoredImage> {
  assertImage(contentType, bytes.byteLength);
  if (!matchesDeclaredType(bytes, contentType)) {
    throw new Error("El archivo no coincide con el tipo de imagen declarado.");
  }
  const ext = extensionFor(contentType)!;
  const safeHint = hint.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40);
  const name = `${crypto.randomUUID()}${safeHint ? `-${safeHint}` : ""}.${ext}`;
  const pathname = `inspo/${name}`;
  if (blobConfigured()) {
    await put(pathname, Buffer.from(bytes), {
      access: "private",
      contentType,
      addRandomSuffix: false,
    });
    return { imagePath: `/api/inspo/media/${pathname}`, contentType };
  }
  if (isProduction()) {
    throw new StorageError(
      "Falta el Blob privado (BLOB_STORE_ID o BLOB_READ_WRITE_TOKEN). La imagen no se guardó.",
      503,
    );
  }
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return { imagePath: `/api/inspo/media/${name}`, contentType };
}

export async function deleteStoredImage(imagePath: string | null): Promise<void> {
  const pathname = blobPathname(imagePath);
  if (!pathname) return;
  if (!blobConfigured()) {
    throw new StorageError("La referencia cambió, pero falta el Blob para borrar la imagen anterior.", 503);
  }
  await del(pathname);
}

function parsePublic(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("La URL de la imagen no es válida.");
  }
  if (parsed.username || parsed.password) throw new Error("Esa URL de imagen no se puede descargar.");
  if (isProduction() && parsed.protocol !== "https:") {
    throw new Error("En producción la imagen tiene que venir por HTTPS.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Esa URL de imagen no se puede descargar.");
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Esa URL de imagen no se puede descargar.");
  }
  if (host === "0.0.0.0" || host === "::1" || host === "[::1]") {
    throw new Error("Esa URL de imagen no se puede descargar.");
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((part) => part > 255)) throw new Error("Esa URL de imagen no se puede descargar.");
    if (a === 10 || a === 127 || a === 0) throw new Error("Esa URL de imagen no se puede descargar.");
    if (a === 169 && b === 254) throw new Error("Esa URL de imagen no se puede descargar.");
    if (a === 192 && b === 168) throw new Error("Esa URL de imagen no se puede descargar.");
    if (a === 172 && b >= 16 && b <= 31) throw new Error("Esa URL de imagen no se puede descargar.");
  }
  return parsed;
}

export async function storeImageFromUrl(url: string): Promise<StoredImage> {
  let current = url;
  for (let hop = 0; hop < 3; hop += 1) {
    const parsed = parsePublic(current);
    const response = await fetch(parsed, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("La redirección de la imagen no es válida.");
      current = new URL(location, parsed).toString();
      continue;
    }
    if (!response.ok) throw new Error("No pude descargar la imagen.");
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const advertised = Number(response.headers.get("content-length") || 0);
    if (advertised > MAX_BYTES) throw new Error("La imagen pasa de 8 MB.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    return storeImage(bytes, contentType, "remota");
  }
  throw new Error("La imagen redirige demasiadas veces.");
}
