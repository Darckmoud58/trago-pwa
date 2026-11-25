import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cronAuthorized, secretsEqual } from './cronAuth.js';

describe('secretsEqual / cronAuthorized', () => {
  const prev = process.env.CRON_SECRET;

  before(() => {
    process.env.CRON_SECRET = 'cron-test-secret-32chars-xxxxxx';
  });

  after(() => {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it('acepta secreto idéntico y rechaza distinto o vacío', () => {
    assert.equal(secretsEqual('abc', 'abc'), true);
    assert.equal(secretsEqual('abc', 'abd'), false);
    assert.equal(secretsEqual('ab', 'abc'), false);
    assert.equal(secretsEqual('', 'abc'), false);
    assert.equal(secretsEqual('abc', ''), false);
  });

  it('autoriza x-cron-secret o Bearer correcto', () => {
    assert.equal(
      cronAuthorized({
        headers: { 'x-cron-secret': 'cron-test-secret-32chars-xxxxxx' },
      }),
      true
    );
    assert.equal(
      cronAuthorized({
        headers: {
          authorization: 'Bearer cron-test-secret-32chars-xxxxxx',
        },
      }),
      true
    );
    assert.equal(
      cronAuthorized({
        headers: { 'x-cron-secret': 'wrong-secret' },
      }),
      false
    );
    assert.equal(cronAuthorized({ headers: {} }), false);
  });

  it('sin CRON_SECRET rechaza siempre', () => {
    delete process.env.CRON_SECRET;
    assert.equal(
      cronAuthorized({
        headers: { 'x-cron-secret': 'anything' },
      }),
      false
    );
    process.env.CRON_SECRET = 'cron-test-secret-32chars-xxxxxx';
  });
});
