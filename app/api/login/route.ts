import { NextResponse } from 'next/server';
import { SESSION_COOKIE, passwordsMatch, signSession } from '@/lib/auth';

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: 'Falta APP_PASSWORD.' }, { status: 503 });
  }
  const form = await request.formData();
  const given = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? '/'));
  const url = new URL(next, request.url);
  if (!passwordsMatch(given, password)) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('error', '1');
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SESSION_COOKIE, await signSession(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function safeNext(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
