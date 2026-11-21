'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login">
      <div className="login-card">
        <h1>No pude cargar los números</h1>
        <p className="quiet">Revisa el token de Instagram en Vercel y vuelve a intentar.</p>
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
