export function redact(text: string, token?: string): string {
  if (!text) return text;
  let out = text;
  if (token) out = out.split(token).join('[redacted]');
  out = out.replace(/access_token=[^&\s"'<>]+/gi, 'access_token=[redacted]');
  out = out.replace(/Bearer\s+[A-Za-z0-9_\-.]+/g, 'Bearer [redacted]');
  return out;
}

export function stripPaging<T>(value: T, token?: string): T {
  return clean(value, token) as T;
}

function clean(value: unknown, token?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => clean(item, token));
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && token && value.includes(token)) return '[redacted]';
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'paging' || key === 'next' || key === 'previous') continue;
    if (typeof item === 'string' && (item.includes('access_token=') || (token && item.includes(token)))) {
      continue;
    }
    out[key] = clean(item, token);
  }
  return out;
}
