import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp } from './clientIp.js';

describe('clientIp', () => {
  afterEach(() => {
    delete process.env.NETLIFY;
    delete process.env.VERCEL;
    delete process.env.TRUST_PROXY;
  });

  it('prioriza cabecera Netlify', () => {
    const ip = clientIp({
      headers: {
        'x-nf-client-connection-ip': '203.0.113.9',
        'x-forwarded-for': '1.2.3.4',
      },
      ip: '10.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    });
    assert.equal(ip, '203.0.113.9');
  });

  it('sin proxy no confía en XFF spoofeado: usa socket', () => {
    delete process.env.NETLIFY;
    delete process.env.TRUST_PROXY;
    const ip = clientIp({
      headers: { 'x-forwarded-for': '8.8.8.8' },
      ip: '8.8.8.8',
      socket: { remoteAddress: '192.168.1.50' },
    });
    assert.equal(ip, '192.168.1.50');
  });

  it('con TRUST_PROXY usa req.ip', () => {
    process.env.TRUST_PROXY = '1';
    const ip = clientIp({
      headers: {},
      ip: '198.51.100.7',
      socket: { remoteAddress: '10.0.0.1' },
    });
    assert.equal(ip, '198.51.100.7');
  });
});
