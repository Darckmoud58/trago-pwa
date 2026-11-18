import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'node_modules/.tmp/cache-policy-test');
mkdirSync(outDir, { recursive: true });

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'src/lib/offlineCachePolicy.ts',
    '--ignoreConfig',
    '--target',
    'es2022',
    '--module',
    'es2022',
    '--skipLibCheck',
    '--outDir',
    outDir,
  ],
  { cwd: root, stdio: 'pipe' }
);

const mod = await import(
  `${pathToFileURL(join(outDir, 'lib/offlineCachePolicy.js')).href}?t=${Date.now()}`
);

test('detecta promos restringidas por alcohol / requiresAuth / audiencia', () => {
  assert.equal(mod.isRestrictedCachedPromo({ requiresAuth: true }), true);
  assert.equal(mod.isRestrictedCachedPromo({ alcohol: true }), true);
  assert.equal(mod.isRestrictedCachedPromo({ audience: 'adult' }), true);
  assert.equal(mod.isRestrictedCachedPromo({ audiencia: 'adulto' }), true);
  assert.equal(
    mod.isRestrictedCachedPromo({
      origen: 'oficial',
      nombre: 'Combo BK',
    }),
    false
  );
});

test('filterGuestSafePromos quita alcohol aunque esté activa y oficial', () => {
  const list = mod.filterGuestSafePromos([
    {
      origen: 'oficial',
      nombre: 'Torres 10',
      alcohol: true,
      termina_en: '2099-01-01',
    },
    {
      origen: 'oficial',
      nombre: 'Autoking',
      termina_en: '2099-01-01',
    },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].nombre, 'Autoking');
});

test('canUseRestrictedOfflineCache exige token + banda adult', () => {
  assert.equal(mod.canUseRestrictedOfflineCache(null, 'adult'), false);
  assert.equal(mod.canUseRestrictedOfflineCache('jwt', 'teen'), false);
  assert.equal(mod.canUseRestrictedOfflineCache('jwt', 'adult'), true);
});

test('PromoDetalle no aplica caché ante 401/403/404', () => {
  const detalle = readFileSync(
    join(root, 'src/pages/PromoDetalle.tsx'),
    'utf8'
  );
  assert.match(
    detalle,
    /status === 401 \|\| status === 403 \|\| status === 404/
  );
  assert.match(detalle, /cacheDelete/);
  assert.match(detalle, /canUseRestrictedOfflineCache/);
});

test('Cuenta distingue offline de sesión inválida', () => {
  const cuenta = readFileSync(join(root, 'src/pages/Cuenta.tsx'), 'utf8');
  assert.match(cuenta, /sessionOfflineKeep/);
  assert.match(cuenta, /ERR_NETWORK/);
  assert.match(cuenta, /status === 401 \|\| status === 403/);
});

test('BottomNav un solo aria-current en /entrar', () => {
  const nav = readFileSync(
    join(root, 'src/components/BottomNav.tsx'),
    'utf8'
  );
  assert.match(nav, /loginReason === 'favorite'/);
  assert.match(nav, /aria-current=\{active \? 'page' : undefined\}/);
});

test('Traguito explica sesión en detalle y enlaza políticas', () => {
  const splash = readFileSync(
    join(root, 'src/components/LocationSplash.tsx'),
    'utf8'
  );
  const i18n = readFileSync(join(root, 'src/lib/i18n.tsx'), 'utf8');
  assert.match(splash, /tourSessionTitle/);
  assert.match(splash, /\/terminos/);
  assert.match(splash, /\/aviso-de-privacidad/);
  assert.match(splash, /openLegal/);
  assert.match(i18n, /tourSessionBody:/);
  assert.match(i18n, /tourTermsCta:/);
  assert.match(i18n, /tourPrivacyCta:/);
});

test('clearToken dispara limpieza de caché sensible', () => {
  const api = readFileSync(join(root, 'src/api.ts'), 'utf8');
  assert.match(api, /clearCatalogCache/);
  assert.match(api, /trago-session/);
});
