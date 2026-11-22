import type { ReactNode } from 'react';
import { sectionLinks } from './Dashboard';

const PRODUCT = [
  ['/', 'Inicio', 'home'],
  ['/analitica', 'Analítica', 'analitica'],
  ['/inspo', 'Inspo', 'inspo'],
] as const;

export function Shell({
  active,
  children,
}: {
  active: 'home' | 'analitica' | 'inspo';
  children: ReactNode;
}) {
  const sections = active === 'analitica' ? sectionLinks() : [];
  return (
    <div className="app">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="brand">
          <a className="logo" href="/">
            studio.dvc
          </a>
        </div>
        <nav aria-label="Estudio">
          <ul>
            {PRODUCT.map(([href, label, id]) => (
              <li key={id}>
                <a className="nav-pill" href={href} aria-current={active === id ? 'page' : undefined}>
                  {label}
                </a>
              </li>
            ))}
            {sections.map(([id, label]) => (
              <li key={id}>
                <a className="nav-pill" href={`#${id}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <form action="/api/logout" method="post">
          <button type="submit" className="btn-secondary">
            Salir
          </button>
        </form>
      </header>
      <main id="contenido" className={active === 'inspo' ? 'flush' : undefined}>
        {children}
      </main>
    </div>
  );
}
