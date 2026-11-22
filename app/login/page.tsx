import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, sessionIsValid } from '@/lib/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const password = process.env.APP_PASSWORD;
  const next = query.next?.startsWith('/') && !query.next.startsWith('//') ? query.next : '/';
  if (password) {
    const store = await cookies();
    if (await sessionIsValid(store.get(SESSION_COOKIE)?.value, password)) redirect(next);
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="brand brand-center">
          <p className="logo">studio.dvc</p>
          <span className="brand-tag">Insights</span>
        </div>
        <h1>Analítica de Instagram</h1>
        <p className="quiet">Página privada. Entra con la contraseña de la app.</p>
        {query.error ? <p className="error">Esa contraseña no es. Prueba otra vez.</p> : null}
        <form method="post" action="/api/login">
          <input type="hidden" name="next" value={next} />
          <label>
            Contraseña
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}
