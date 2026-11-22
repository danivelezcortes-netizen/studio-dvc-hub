import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MS, passwordsMatch, signSession } from '@/lib/auth';
import { clientIp, loginGate } from '@/lib/login-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: 'Falta APP_PASSWORD.' }, { status: 503 });
  }
  const form = await request.formData();
  const given = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? '/'));
  const url = new URL(next, request.url);
  const passwordOk = passwordsMatch(given, password);
  const gate = await loginGate(clientIp(request.headers.get('x-forwarded-for')), passwordOk);
  if (gate === 'limited' || !passwordOk) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('error', gate === 'limited' ? '2' : '1');
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SESSION_COOKIE, await signSession(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MS / 1000,
  });
  return response;
}

function safeNext(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
