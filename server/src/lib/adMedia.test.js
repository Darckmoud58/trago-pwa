import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleParts,
  assertCreativeMeta,
  decodeChunk,
} from './adMedia.js';

describe('adMedia', () => {
  it('acepta mp4 y rechaza un tipo ajeno', () => {
    assert.equal(assertCreativeMeta({ mime: 'video/mp4', total: 2, index: 1 }).mime, 'video/mp4');
    assert.throws(() => assertCreativeMeta({ mime: 'application/pdf', total: 1, index: 0 }));
  });

  it('junta los fragmentos en orden', () => {
    const a = Buffer.from('hola ');
    const b = Buffer.from('video');
    const file = assembleParts(
      [
        { index: 1, chunk: b },
        { index: 0, chunk: a },
      ],
      'video/mp4'
    );
    assert.equal(file.toString(), 'hola video');
  });

  it('espera si aún falta un fragmento', () => {
    const file = assembleParts([{ index: 1, chunk: Buffer.from('b') }], 'image/jpeg');
    assert.equal(file, null);
  });

  it('decodifica un fragmento base64', () => {
    const chunk = decodeChunk(Buffer.from('poster').toString('base64'));
    assert.equal(chunk.toString(), 'poster');
  });
});
