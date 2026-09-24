import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Promo } from '../types';
import './Legal.css';
import './Home.css';

const AGE_KEY = 'trago_age_ack';

const ZONAS = [
  { name: 'Americana', hint: 'Chapultepec' },
  { name: 'Providencia', hint: 'Andares' },
  { name: 'Centro', hint: 'Histórico' },
  { name: 'Chapalita', hint: 'Zapopan' },
  { name: 'Plaza del Sol', hint: 'Sur' },
];

export default function Home() {
  const [showAge, setShowAge] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promosError, setPromosError] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AGE_KEY)) setShowAge(true);
  }, []);

  useEffect(() => {
    api
      .get('/api/promociones')
      .then((res) => {
        const list = (res.data.promos ?? []) as Promo[];
        const destacadas = list.filter((p) => p.featured || p.destacada);
        setPromos((destacadas.length ? destacadas : list).slice(0, 4));
      })
      .catch(() => setPromosError(true));
  }, []);

  function ackAge() {
    localStorage.setItem(AGE_KEY, '1');
    setShowAge(false);
  }

  return (
    <div className="home">
      {showAge && (
        <div className="age-banner" role="dialog" aria-label="Aviso de edad">
          <p>
            Hay promociones con <strong>alcohol solo para 18+</strong>. Al
            continuar confirmas haber leído los{' '}
            <Link to="/terminos">términos</Link> y el{' '}
            <Link to="/aviso-de-privacidad">aviso de privacidad</Link>.
          </p>
          <button type="button" className="btn primary" onClick={ackAge}>
            Entendido
          </button>
        </div>
      )}

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-copy rise">
          <p className="brand-hero">TraGo</p>
          <h1>Promos vigentes, cerca de ti.</h1>
          <p className="lead">
            Ofertas reales en la ZMG. Guarda tus lugares y ábrelos aunque no
            tengas señal.
          </p>
          <div className="cta-row">
            <Link className="btn primary" to="/promos">
              Ver promos
            </Link>
            <Link className="btn ghost" to="/cerca">
              Cerca de mí
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section zonas rise" style={{ animationDelay: '0.08s' }}>
        <div className="section-head">
          <p className="label">Zona Metropolitana</p>
          <h2>Explora por zona</h2>
        </div>
        <div className="zona-row">
          {ZONAS.map((z) => (
            <Link key={z.name} className="zona-chip" to="/cerca">
              <span className="zona-name">{z.name}</span>
              <span className="zona-hint">{z.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head row-between">
          <div>
            <p className="label">Ahora mismo</p>
            <h2>Destacadas</h2>
          </div>
          <Link className="text-link" to="/promos">
            Ver todas →
          </Link>
        </div>
        {promosError && (
          <p className="muted">
            No pudimos cargar promos. Revisa que la API esté en marcha o entra
            más tarde.
          </p>
        )}
        {!promosError && promos.length === 0 && (
          <p className="muted">Cargando promos…</p>
        )}
        <div className="promo-grid home-promos">
          {promos.map((p, i) => (
            <Link
              key={p._id}
              to={`/promos/${p.slug || p._id}`}
              className="promo-card home-promo-card rise"
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}
            >
              <p className="label">{p.chainName || 'Cadena'}</p>
              <h3>{p.nombre || p.title}</h3>
              {(p.descripcion || p.subtitle) && (
                <p className="meta">{p.descripcion || p.subtitle}</p>
              )}
              <p className="meta">
                {p.alcohol ? '18+ · ' : ''}
                {(p.termina_en || p.endsAt) &&
                  `hasta ${new Date(
                    p.termina_en || p.endsAt!
                  ).toLocaleDateString()}`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <p className="label">En tres pasos</p>
          <h2>Cómo funciona</h2>
        </div>
        <div className="grid3">
          <article className="feature-card">
            <p className="step-num">01</p>
            <h3>Descubre</h3>
            <p>
              Catálogo de promociones vigentes. Alcohol y nocturno filtrados
              para mayores de 18.
            </p>
            <Link className="text-link" to="/promos">
              Ir a promos →
            </Link>
          </article>
          <article className="feature-card">
            <p className="step-num">02</p>
            <h3>Ubica</h3>
            <p>
              Activa tu GPS y encuentra sucursales a pocos kilómetros en
              Guadalajara y Zapopan.
            </p>
            <Link className="text-link" to="/cerca">
              Abrir cerca →
            </Link>
          </article>
          <article className="feature-card">
            <p className="step-num">03</p>
            <h3>Guarda offline</h3>
            <p>
              Marca favoritos en el corazón. Quedan en tu teléfono sin
              internet.
            </p>
            <Link className="text-link" to="/favoritos">
              Mis favoritos →
            </Link>
          </article>
        </div>
      </section>

      <section className="offline-band rise">
        <div className="offline-copy">
          <p className="label light">Sin señal</p>
          <h2>Tus favoritos viajan contigo</h2>
          <p>
            Guarda sucursales y negocios desde Cerca o Negocios. Cuando el
            centro comercial te deje sin datos, ábrelos igual desde Favoritos.
          </p>
          <div className="cta-row">
            <Link className="btn primary" to="/favoritos">
              Ver favoritos
            </Link>
            <Link className="btn ghost light" to="/cerca">
              Empezar a guardar
            </Link>
          </div>
        </div>
        <div className="offline-visual" aria-hidden>
          <div className="offline-card">
            <span>♥</span>
            <strong>Guardado aquí</strong>
            <em>Disponible offline</em>
          </div>
        </div>
      </section>

      <section className="biz-band">
        <div className="biz-copy">
          <p className="label">Para negocios</p>
          <h2>Publica tu promo donde la gente ya está buscando</h2>
          <p className="lead">
            TraGo es el canal para que tu cadena o local llegue a quien anda
            cerca, con fechas claras y reputación en piso.
          </p>
          <div className="cta-row">
            <Link className="btn primary" to="/registro">
              Crear cuenta
            </Link>
            <Link className="btn ghost" to="/negocios">
              Ver negocios
            </Link>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <p>
          Cuenta desde 13 años · Contenido con alcohol solo 18+ · La vigencia
          la confirma el local ·{' '}
          <Link to="/terminos">Términos</Link> ·{' '}
          <Link to="/aviso-de-privacidad">Privacidad</Link>
        </p>
      </section>
    </div>
  );
}
