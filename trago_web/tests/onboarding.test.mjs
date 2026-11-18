import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../node_modules/.tmp/onboarding-test/onboarding.js', import.meta.url),
  'utf8'
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

let instance = 0;
async function setup({ saved = false, blocked = false } = {}) {
  const values = new Map(saved ? [['trago_onboarding_v1', '1']] : []);
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem(key) {
      if (blocked) throw new Error('Storage unavailable');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (blocked) throw new Error('Storage unavailable');
      values.set(key, value);
    },
  };
  const tour = await import(`${moduleUrl}#test=${instance++}`);
  return { tour, values };
}

test('first visit waits for an explicit choice, then persists dismissal', async () => {
  const { tour, values } = await setup();
  assert.equal(tour.isOnboardingPending(), true);
  let destination;
  window.addEventListener(tour.SPLASH_CLOSED, (event) => {
    destination = event.detail.destination;
  });
  tour.finishOnboarding('catalog');
  assert.equal(destination, 'catalog');
  assert.equal(tour.isOnboardingPending(), false);
  assert.equal(values.get(tour.ONBOARDING_KEY), '1');
});

test('returning visitor does not get the tutorial automatically', async () => {
  const { tour } = await setup({ saved: true });
  assert.equal(tour.hasSeenOnboarding(), true);
  assert.equal(tour.isOnboardingPending(), false);
});

test('replay temporarily blocks install prompts without deleting the saved preference', async () => {
  const { tour, values } = await setup({ saved: true });
  let opened = false;
  window.addEventListener(tour.ONBOARDING_OPEN, () => {
    opened = true;
  });
  tour.replayOnboarding();
  assert.equal(opened, true);
  tour.markOnboardingOpen();
  assert.equal(tour.isOnboardingPending(), true);
  tour.finishOnboarding();
  assert.equal(tour.isOnboardingPending(), false);
  assert.equal(values.get(tour.ONBOARDING_KEY), '1');
});

test('blocked browser storage still allows dismissal and replay in the current session', async () => {
  const { tour } = await setup({ blocked: true });
  assert.equal(tour.isOnboardingPending(), true);
  assert.doesNotThrow(() => tour.finishOnboarding('catalog'));
  assert.equal(tour.isOnboardingPending(), false);
  tour.markOnboardingOpen();
  assert.equal(tour.isOnboardingPending(), true);
  tour.finishOnboarding();
  assert.equal(tour.isOnboardingPending(), false);
});

test('nearby is a distinct explicit action and onboarding never calls geolocation', async () => {
  const { tour } = await setup();
  let destination;
  window.addEventListener(tour.SPLASH_CLOSED, (event) => {
    destination = event.detail.destination;
  });
  tour.finishOnboarding('near');
  assert.equal(destination, 'near');
  assert.equal(tour.hasSeenOnboarding(), true);
});

test('home finish keeps session dismissed without a near destination', async () => {
  const { tour } = await setup();
  let destination = 'unset';
  window.addEventListener(tour.SPLASH_CLOSED, (event) => {
    destination = event.detail.destination;
  });
  tour.finishOnboarding('home');
  assert.equal(destination, undefined);
  assert.equal(tour.hasSeenOnboarding(), true);
  assert.equal(tour.isOnboardingPending(), false);
});
