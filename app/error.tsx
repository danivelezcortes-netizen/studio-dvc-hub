'use client';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand brand-center">
          <p className="logo">studio.dvc</p>
          <span className="brand-tag">Insights</span>
        </div>
        <h1>No pude cargar esta página</h1>
        <p className="quiet">{error.message || "Vuelve a intentar."}</p>
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
