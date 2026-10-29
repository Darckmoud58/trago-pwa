// Descubre *.test.js bajo src/ y los pasa a node --test.
// Evita el glob entre comillas que en Linux/CI no se expande.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p, out);
    else if (name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const files = collect('src').sort();
if (!files.length) {
  console.error('No se encontraron *.test.js bajo src/');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
