import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyCatalogEntry,
  isLandingPromoTitle,
  looksLikeInternalResourceName,
  sanitizePromoTitle,
} from './catalogQuality.js';

describe('catalogQuality', () => {
  it('detecta landings OXXO / conoce todas', () => {
    assert.equal(isLandingPromoTitle('Promociones OXXO'), true);
    assert.equal(
      classifyCatalogEntry({
        title: 'Conoce todas nuestras promociones',
        description: 'Suscríbete al correo',
      }).publish,
      false
    );
  });

  it('detecta nombres internos CMS', () => {
    assert.equal(looksLikeInternalResourceName('HappyStarBurger Vxb7fl'), true);
    assert.equal(looksLikeInternalResourceName('OfertaComboFirewood Ijlavz'), true);
    assert.equal(looksLikeInternalResourceName('2x1 en café'), false);
  });

  it('limpia sufijo interno sin inventar', () => {
    assert.equal(sanitizePromoTitle('HappyStarBurger Vxb7fl'), 'HappyStarBurger');
  });

  it('publica oferta con beneficio', () => {
    const c = classifyCatalogEntry({
      title: '2x1 en Maruchan',
      description: '2X$48',
      price: 48,
    });
    assert.equal(c.kind, 'oferta');
    assert.equal(c.publish, true);
  });

  it('publica cards del grid oficial OXXO sin 2x1 en el título', () => {
    const c = classifyCatalogEntry({
      title: 'Agua alcalina Vitawa 1.5L',
      description: 'Bebidas',
      fromOfficialPromoGrid: true,
    });
    assert.equal(c.publish, true);
    assert.equal(c.reason, 'listado-oficial');
  });
});
