import { Shell } from '@/components/Shell';

export default function HomePage() {
  return (
    <Shell active="home">
      <div className="page">
        <header className="masthead">
          <p className="kicker">Studio DVC</p>
          <h2>Un solo lugar para el estudio.</h2>
          <p className="lede">Los números de Instagram y el tablero de inspiración, con la misma contraseña.</p>
        </header>
        <div className="home-grid">
          <a className="home-card" href="/analitica">
            <p className="kicker">01</p>
            <h3>Analítica</h3>
            <p>Qué se vio, qué se guardó y qué conviene repetir en @studio.dvc.</p>
          </a>
          <a className="home-card home-card-yellow" href="/inspo">
            <p className="kicker">02</p>
            <h3>Inspo</h3>
            <p>Outfits, bolsos, hooks y la lista de esta semana, en un solo tablero.</p>
          </a>
        </div>
      </div>
    </Shell>
  );
}
