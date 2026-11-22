import "server-only";

import { createHash } from "node:crypto";
import { databaseUrl } from "./inspo/config";
import { getSql } from "./inspo/db";
import { ensureSchema } from "./inspo/schema";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const memory = new Map<string, number[]>();

export function loginKey(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function clientIp(header: string | null): string {
  const first = header?.split(",")[0]?.trim();
  return first || "unknown";
}

export function memoryGate(key: string, passwordOk: boolean, now = Date.now()): "ok" | "limited" {
  const recent = (memory.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) {
    memory.set(key, recent);
    return "limited";
  }
  if (!passwordOk) {
    recent.push(now);
    memory.set(key, recent);
    return "ok";
  }
  memory.delete(key);
  return "ok";
}

export function resetLoginLimitForTests() {
  memory.clear();
}

export async function loginGate(ip: string, passwordOk: boolean): Promise<"ok" | "limited"> {
  const key = loginKey(ip);
  if (!databaseUrl()) return memoryGate(key, passwordOk);
  try {
    const sql = getSql();
    await ensureSchema(sql);
    return await sql.transaction(async (tx) => {
      await tx.query(`delete from login_attempts where created_at < now() - interval '15 minutes'`);
      const rows = await tx.query<{ count: number | string }>(
        `select count(*)::int as count from login_attempts where key_hash = $1`,
        [key],
      );
      const count = Number(rows[0]?.count ?? 0);
      if (count >= MAX_FAILURES) return "limited";
      if (!passwordOk) await tx.query(`insert into login_attempts (key_hash) values ($1)`, [key]);
      else await tx.query(`delete from login_attempts where key_hash = $1`, [key]);
      return "ok";
    });
  } catch {
    return memoryGate(key, passwordOk);
  }
}
