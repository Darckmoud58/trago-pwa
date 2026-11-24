import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_ANUNCIO_BORRADORES,
  assertCanCreateDraft,
  draftLimitMessage,
} from './anuncioDrafts.js';

describe('anuncioDrafts', () => {
  it('permite hasta 9 borradores y bloquea el 10º+1', () => {
    assert.equal(MAX_ANUNCIO_BORRADORES, 10);
    assert.doesNotThrow(() => assertCanCreateDraft(0));
    assert.doesNotThrow(() => assertCanCreateDraft(9));
    assert.throws(() => assertCanCreateDraft(10), /Máximo 10 borradores/);
    assert.throws(() => assertCanCreateDraft(11), /Máximo 10 borradores/);
  });

  it('expone mensaje claro con el tope', () => {
    assert.match(draftLimitMessage(10), /10/);
    assert.match(draftLimitMessage(10), /Publica o elimina/);
  });
});
