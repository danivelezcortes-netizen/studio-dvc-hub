import { useEffect, useState } from 'react';
import { Shell } from './components/Shell';
import { sections } from './sections';

function sectionFromHash(): string {
  const id = window.location.hash.replace(/^#/, '');
  return sections.some((section) => section.id === id) ? id : sections[0].id;
}

export function App() {
  const [activeId, setActiveId] = useState(sectionFromHash);

  useEffect(() => {
    const sync = () => setActiveId(sectionFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    const section = sections.find((item) => item.id === activeId);
    document.title = section ? `${section.label} · Studio DVC Hub` : 'Studio DVC Hub';
  }, [activeId]);

  const current = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <Shell activeId={current.id}>
      <current.Component />
    </Shell>
  );
}
