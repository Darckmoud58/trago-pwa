import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import {
  normalizeVapidPublicKey,
  publicVapidKey,
  vapidConfigured,
} from './push.js';

describe('push / VAPID', () => {
  it('vapidConfigured exige subject + par de claves', () => {
    assert.equal(vapidConfigured({}), false);
    assert.equal(
      vapidConfigured({
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
      }),
      false
    );
    assert.equal(
      vapidConfigured({
        VAPID_SUBJECT: 'mailto:a@b.c',
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
      }),
      true
    );
  });

  it('publicVapidKey normaliza y valida longitud 65', () => {
    const { publicKey } = webpush.generateVAPIDKeys();
    assert.equal(publicVapidKey({ VAPID_PUBLIC_KEY: publicKey }), publicKey);
    assert.equal(publicVapidKey({ VAPID_PUBLIC_KEY: 'srv' }), '');
    assert.equal(publicVapidKey({}), '');
  });

  it('normalizeVapidPublicKey antepone 0x04 si vienen 64 bytes', () => {
    const { publicKey } = webpush.generateVAPIDKeys();
    const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
    const raw = Buffer.from(
      (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );
    assert.equal(raw[0], 0x04);
    const withoutPrefix = raw.subarray(1).toString('base64url');
    const fixed = normalizeVapidPublicKey(withoutPrefix);
    assert.equal(fixed, publicKey);
  });
});
