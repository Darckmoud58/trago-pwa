import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHttpUrl } from './safeUrl.js';

describe('sanitizeHttpUrl', () => {
  it('permite http(s)', () => {
    assert.equal(
      sanitizeHttpUrl('https://example.com/a?x=1'),
      'https://example.com/a?x=1'
    );
    assert.ok(sanitizeHttpUrl('http://cdn.example/img.png').startsWith('http://'));
  });

  it('rechaza javascript, data y basura', () => {
    assert.equal(sanitizeHttpUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeHttpUrl('data:text/html,<h1>x</h1>'), '');
    assert.equal(sanitizeHttpUrl('not a url'), '');
    assert.equal(sanitizeHttpUrl(''), '');
    assert.equal(sanitizeHttpUrl(null), '');
  });
});
