import { bearerToken, passwordsMatch } from "@/lib/auth";

const DUMMY = "00000000000000000000000000000000";
export const INGEST_MIN = 32;

export function authorizeIngest(header: string | null): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.INGEST_TOKEN ?? "";
  if (expected && expected.length < INGEST_MIN) {
    return { ok: false, status: 503, error: "INGEST_TOKEN tiene que tener al menos 32 caracteres." };
  }
  const given = bearerToken(header) ?? "";
  const compared = passwordsMatch(given, expected || DUMMY);
  if (!expected || !compared) return { ok: false, status: 401, error: "No autorizado." };
  return { ok: true };
}
