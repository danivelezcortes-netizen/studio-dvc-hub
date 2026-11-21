import type { ReactNode } from 'react';
import { sectionLinks } from './Dashboard';

export function Shell({ children }: { children: ReactNode }) {
  const links = sectionLinks();
  return (
    <div className="app">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="sidebar">
        <p className="brand-kicker">@studio.dvc</p>
        <h1>Studio DVC</h1>
        <nav aria-label="Secciones">
          <ul>
            {links.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <form action="/api/logout" method="post">
          <button type="submit" className="logout">
            Salir
          </button>
        </form>
      </header>
      <div className="topbar">
        <div>
          <p>@studio.dvc</p>
          <h1>Studio DVC</h1>
        </div>
        <nav aria-label="Secciones">
          <ul>
            {links.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <main id="contenido">{children}</main>
    </div>
  );
}
