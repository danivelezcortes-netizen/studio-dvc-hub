import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, passwordsMatch, readBasicPassword, sessionIsValid } from './lib/auth';

export async function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse('Falta APP_PASSWORD en el servidor.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const basic = readBasicPassword(request.headers.get('authorization'));
  if (basic && passwordsMatch(basic, password)) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (await sessionIsValid(session, password)) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  login.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/login).*)'],
};
