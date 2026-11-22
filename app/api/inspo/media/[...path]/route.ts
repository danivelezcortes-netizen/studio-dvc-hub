import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { isProduction } from "@/lib/inspo/config";
import { uploadsDir } from "@/lib/inspo/media";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type Context = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: Context) {
  const parts = (await context.params).path ?? [];
  if (
    parts.length === 0 ||
    parts.some((part) => part === "" || part === "." || part === ".." || part.includes("/") || part.includes("\\"))
  ) {
    return NextResponse.json({ error: "Nombre inválido." }, { status: 400 });
  }
  const pathname = parts.join("/");
  const contentType = TYPES[path.extname(pathname).toLowerCase()];
  if (!contentType) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });

  if (pathname.startsWith("inspo/")) {
    if (!/^inspo\/[A-Za-z0-9._-]+$/.test(pathname)) {
      return NextResponse.json({ error: "Nombre inválido." }, { status: 400 });
    }
    try {
      const result = await get(pathname, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return NextResponse.json({ error: "No está el archivo." }, { status: 404 });
      }
      const served = result.blob.contentType || contentType;
      if (!served.startsWith("image/")) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
      return new NextResponse(result.stream, {
        headers: {
          "content-type": served,
          "x-content-type-options": "nosniff",
          "cache-control": "private, no-store",
        },
      });
    } catch {
      return NextResponse.json({ error: "No pude leer la imagen privada." }, { status: 503 });
    }
  }

  if (isProduction() || parts.length !== 1 || !/^[A-Za-z0-9._-]+$/.test(pathname)) {
    return NextResponse.json({ error: "No está el archivo." }, { status: 404 });
  }
  const root = path.resolve(uploadsDir());
  const file = path.resolve(root, pathname);
  if (file !== path.join(root, pathname)) return NextResponse.json({ error: "Nombre inválido." }, { status: 400 });
  try {
    const bytes = await readFile(file);
    return new NextResponse(bytes, {
      headers: {
        "content-type": contentType,
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "No está el archivo." }, { status: 404 });
  }
}
