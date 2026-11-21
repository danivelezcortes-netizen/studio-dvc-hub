import type { ReactNode } from 'react';
import { analytics } from '../data';
import { formatUpdated } from '../lib/metrics';
import { sections } from '../sections';

type ShellProps = {
  activeId: string;
  children: ReactNode;
};

export function Shell({ activeId, children }: ShellProps) {
  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="sidebar">
        <div className="brand">
          <p className="brand-kicker">{analytics.account}</p>
          <h1>Studio DVC Hub</h1>
        </div>
        <SectionNav activeId={activeId} />
        <p className="sidebar-foot">Updated {formatUpdated(analytics.generatedAt)}</p>
      </header>
      <div className="topbar">
        <div className="topbar-title">
          <p>{analytics.account}</p>
          <h1>Studio DVC Hub</h1>
        </div>
        <SectionNav activeId={activeId} />
      </div>
      <main id="content">
        {children}
        <p className="page-foot">Studio DVC Hub · {analytics.account}</p>
      </main>
    </div>
  );
}

function SectionNav({ activeId }: { activeId: string }) {
  return (
    <nav aria-label="Sections">
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} aria-current={section.id === activeId ? 'page' : undefined}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
