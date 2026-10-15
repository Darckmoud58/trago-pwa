import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { publicVapidKey, vapidConfigured } from './push.js';

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

  it('publicVapidKey prefiere VITE_ o VAPID_', () => {
    assert.equal(
      publicVapidKey({ VITE_VAPID_PUBLIC_KEY: 'vite', VAPID_PUBLIC_KEY: 'srv' }),
      'vite'
    );
    assert.equal(publicVapidKey({ VAPID_PUBLIC_KEY: 'srv' }), 'srv');
    assert.equal(publicVapidKey({}), '');
  });
});
