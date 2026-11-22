export const SESSION_COOKIE = 'dvc_session';
const PAYLOAD = 'studio-dvc-v1';

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function signSession(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(PAYLOAD));
  return toHex(signature);
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

export async function sessionIsValid(token: string | undefined, password: string): Promise<boolean> {
  if (!token || !password) return false;
  const expected = await signSession(password);
  return passwordsMatch(token, expected);
}

export function readBasicPassword(header: string | null): string | null {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return decoded.slice(separator + 1);
  } catch {
    return null;
  }
}
