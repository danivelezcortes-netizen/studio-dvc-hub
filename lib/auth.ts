export const SESSION_COOKIE = 'dvc_session';
export const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(password: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toHex(signature);
}

export async function signSession(password: string, expiresAt = Date.now() + SESSION_MS): Promise<string> {
  const payload = `v2.${expiresAt}`;
  return `${payload}.${await hmacHex(password, payload)}`;
}

export function passwordsMatch(input: string, expected: string): boolean {
  const left = new TextEncoder().encode(input);
  const right = new TextEncoder().encode(expected);
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

export async function sessionIsValid(token: string | undefined, password: string, now = Date.now()): Promise<boolean> {
  if (!token || !password) return false;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(payload.slice(3));
  if (!payload.startsWith('v2.') || !Number.isFinite(expiresAt) || expiresAt <= now) return false;
  const expected = await hmacHex(password, payload);
  return passwordsMatch(signature, expected);
}

export function bearerToken(header: string | null): string | null {
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

