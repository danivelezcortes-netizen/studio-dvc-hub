import "server-only";

import { assertImage } from "./media";
import type { ImagePayload } from "./store";
import { parseItemInput } from "./validate";

export async function readItemRequest(request: Request): Promise<{
  input: ReturnType<typeof parseItemInput>;
  image: ImagePayload | null;
  removeImage: boolean;
}> {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const raw = form.get("payload");
    const parsed = typeof raw === "string" ? JSON.parse(raw) : Object.fromEntries(form.entries());
    if (typeof raw !== "string" && parsed.tags && typeof parsed.tags === "string") {
      parsed.tags = parsed.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean);
    }
    if (typeof raw !== "string" && parsed.notes && typeof parsed.notes === "string") {
      parsed.notes = parsed.notes.split("\n").map((line: string) => line.trim()).filter(Boolean);
    }
    if (typeof raw !== "string") {
      parsed.addToWeek = parsed.addToWeek === "true" || parsed.addToWeek === "1" || parsed.addToWeek === "on";
    }
    const file = form.get("image");
    let image: ImagePayload | null = null;
    if (file instanceof File && file.size > 0) {
      assertImage(file.type || "application/octet-stream", file.size);
      image = { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type, filename: file.name || "imagen" };
    }
    return {
      input: parseItemInput(parsed),
      image,
      removeImage: form.get("removeImage") === "true",
    };
  }
  const body = (await request.json()) as Record<string, unknown>;
  return { input: parseItemInput(body), image: null, removeImage: body.removeImage === true };
}
