import type { ReactNode } from 'react';
import { sectionLinks } from './Dashboard';

export function Shell({ children }: { children: ReactNode }) {
  const links = sectionLinks();
  return (
    <div className="app">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="brand">
          <a className="logo" href="#contenido">
            studio.dvc
          </a>
          <span className="brand-tag">Insights</span>
        </div>
        <nav aria-label="Secciones">
          <ul>
            {links.map(([id, label]) => (
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
      <main id="contenido">{children}</main>
    </div>
  );
}
