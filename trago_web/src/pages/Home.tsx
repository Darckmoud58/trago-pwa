import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-copy rise">
          <p className="brand-hero">TraGo</p>
          <h1>Promos que sí se cumplen. Cerca de ti.</h1>
          <p className="lead">
            Oficiales, publicadas por la cadena y validadas en piso. Opina, gana
            puntos, canjea cupones.
          </p>
          <div className="cta-row">
            <Link className="btn primary" to="/promos">
              Ver promos
            </Link>
            <Link className="btn ghost" to="/cerca">
              Cerca de mí
            </Link>
            <Link className="btn ghost" to="/entrar">
              Entrar
            </Link>
          </div>
        </div>
      </section>

      <section className="motors">
        <h2>Tres motores, una verdad</h2>
        <p className="lead narrow">
          El profesor pidió involucrar al usuario y a la empresa. TraGo premia la
          opinión en sucursal y da a la cadena un canal para publicar.
        </p>
        <div className="grid3">
          <article>
            <p className="label">Oficial</p>
            <h3>Página de la cadena</h3>
            <p>Sync de promociones públicas. Fuente verificable.</p>
          </article>
          <article>
            <p className="label">Empresa</p>
            <h3>Se registra y publica</h3>
            <p>Panel propio y ofertas con fechas. La reputación mide si cumplen.</p>
          </article>
          <article>
            <p className="label">Usuario</p>
            <h3>Opina y gana</h3>
            <p>Vigencia con GPS, puntos y cupones. Incentivo a la calle y a la caja.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
