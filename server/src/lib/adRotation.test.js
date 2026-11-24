import assert from 'node:assert/strict';
import test from 'node:test';
import { isDemoAd, selectPlacement, selectSlotRotation } from './adRotation.js';

test('el creativo beta se reconoce como demostración', () => {
  assert.equal(isDemoAd({ slug: 'trago-beta-ads' }), true);
  assert.equal(isDemoAd({ titulo: 'Beta · Cerca de ti' }), true);
  assert.equal(isDemoAd({ titulo: 'Barra Ficticia · noche' }), false);
});

test('si hay un anuncio pagado, el demo sale de ese slot', () => {
  const empresas = {
    beta: { slug: 'trago-beta-ads', nombre: 'TraGo Beta Ads' },
    barra: { slug: 'barra-ficticia-trago', nombre: 'Barra Ficticia TraGo' },
  };
  const picked = selectSlotRotation(
    [
      { id_empresa: 'barra', titulo: 'Barra Ficticia · noche', slot: 'home_rail' },
      { id_empresa: 'beta', titulo: 'Beta · Noche en la ciudad', slot: 'home_rail' },
    ],
    empresas
  );
  assert.deepEqual(
    picked.map((row) => row.titulo),
    ['Barra Ficticia · noche']
  );
});

test('dos cadenas en el mismo slot rotan, una sola vez cada una', () => {
  const empresas = {
    a: { slug: 'mesa-ficticia', nombre: 'Mesa Ficticia' },
    b: { slug: 'barra-ficticia', nombre: 'Barra Ficticia' },
  };
  const picked = selectSlotRotation(
    [
      { id_empresa: 'a', titulo: 'Mesa nueva' },
      { id_empresa: 'a', titulo: 'Mesa vieja' },
      { id_empresa: 'b', titulo: 'Barra' },
    ],
    empresas
  );
  assert.deepEqual(
    picked.map((row) => row.titulo),
    ['Mesa nueva', 'Barra']
  );
});

test('sin pagados, el demo sigue visible en su propio slot', () => {
  const picked = selectSlotRotation(
    [{ id_empresa: 'beta', titulo: 'Beta · Cerca de ti' }],
    { beta: { slug: 'trago-beta-ads', nombre: 'TraGo Beta Ads' } }
  );
  assert.equal(picked.length, 1);
  assert.equal(picked[0].titulo, 'Beta · Cerca de ti');
});

test('quien pagó la posición tiene prioridad sobre la aleatoria', () => {
  const empresas = {
    fija: { slug: 'barra', nombre: 'Barra' },
    libre: { slug: 'mesa', nombre: 'Mesa' },
  };
  const picked = selectPlacement(
    [
      { id_empresa: 'libre', titulo: 'Mesa aleatoria', posicion: 'aleatoria' },
      { id_empresa: 'fija', titulo: 'Barra a la izquierda', posicion: 'inicio_side_left' },
    ],
    'inicio_side_left',
    empresas
  );
  assert.deepEqual(
    picked.map((row) => row.titulo),
    ['Barra a la izquierda']
  );
});

test('la aleatoria entra cuando esa posición nadie la pagó', () => {
  const picked = selectPlacement(
    [
      { id_empresa: 'fija', titulo: 'Barra en la tarjeta', posicion: 'home_rail' },
      { id_empresa: 'libre', titulo: 'Mesa aleatoria', posicion: 'aleatoria' },
    ],
    'inicio_side_left',
    { fija: { slug: 'barra', nombre: 'Barra' }, libre: { slug: 'mesa', nombre: 'Mesa' } }
  );
  assert.deepEqual(
    picked.map((row) => row.titulo),
    ['Mesa aleatoria']
  );
});
