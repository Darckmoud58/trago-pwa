import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapNominatimHit, searchMexicoAddress } from './addressSearch.js';

describe('addressSearch', () => {
  it('toma municipio y código postal de una calle mexicana', () => {
    const lugar = mapNominatimHit({
      lat: '20.6768',
      lon: '-103.3472',
      display_name: 'Manuel Acuña 120, Americana, Guadalajara, Jalisco, 44160, México',
      address: {
        house_number: '120',
        road: 'Manuel Acuña',
        suburb: 'Americana',
        city: 'Guadalajara',
        state: 'Jalisco',
        postcode: '44160',
        country_code: 'mx',
      },
    });
    assert.equal(lugar.calle, 'Manuel Acuña');
    assert.equal(lugar.numero, '120');
    assert.equal(lugar.colonia, 'Americana');
    assert.equal(lugar.municipio, 'Guadalajara');
    assert.equal(lugar.estado, 'Jalisco');
    assert.equal(lugar.codigoPostal, '44160');
    assert.equal(lugar.lat, 20.6768);
    assert.equal(lugar.lng, -103.3472);
  });

  it('descarta resultados fuera de México', () => {
    assert.equal(
      mapNominatimHit({
        lat: '40.4',
        lon: '-3.7',
        address: { country_code: 'es', road: 'Calle Mayor', city: 'Madrid' },
      }),
      null
    );
  });

  it('pide coincidencias en México y conserva el municipio', async () => {
    const urls = [];
    const lugares = await searchMexicoAddress({ calle: 'Manuel Acuña' }, async (url) => {
      urls.push(String(url));
      return {
        ok: true,
        json: async () => [
          {
            lat: '20.67',
            lon: '-103.35',
            display_name: 'Calle Manuel Acuña, Santa Tere, Guadalajara, Jalisco, 44200, México',
            address: {
              road: 'Calle Manuel Acuña',
              suburb: 'Santa Tere',
              city: 'Guadalajara',
              state: 'Jalisco',
              postcode: '44200',
              country_code: 'mx',
            },
          },
        ],
      };
    });
    assert.equal(urls.length >= 1, true);
    assert.match(urls[0], /countrycodes=mx/);
    assert.match(urls[0], /Manuel/);
    assert.equal(lugares[0].municipio, 'Guadalajara');
    assert.equal(lugares[0].codigoPostal, '44200');
  });

  it('no consulta la red si la calle es demasiado corta', async () => {
    let called = false;
    const lugares = await searchMexicoAddress({ calle: 'a' }, async () => {
      called = true;
      return { ok: true, json: async () => [] };
    });
    assert.equal(called, false);
    assert.deepEqual(lugares, []);
  });
});
