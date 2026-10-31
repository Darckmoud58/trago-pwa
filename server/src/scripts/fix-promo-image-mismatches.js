/**
 * Limpia imagenes de promos oficiales cuyo URL contradice el titulo
 * (ej. Act II con foto Maruchan). Uso:
 *   cd server && node src/scripts/fix-promo-image-mismatches.js
 */
import dotenv from 'dotenv';
import { requireEnv } from '../config/env.js';
import { connectDB } from '../db/connect.js';
import Promocion from '../models/Promocion.js';

dotenv.config();

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function imageConflictsWithTitle(title, imageUrl) {
  if (!title || !imageUrl) return false;
  let path = imageUrl;
  try {
    path = decodeURIComponent(imageUrl);
  } catch {
    /* keep */
  }
  const t = normalize(title);
  const u = normalize(path);
  const markers = [
    { tag: 'maruchan', keys: ['maruchan', 'instantlunch'] },
    { tag: 'actii', keys: ['actii', 'act2', 'act-ii', 'palomitasact'] },
    { tag: 'doritos', keys: ['doritos'] },
    { tag: 'ruffles', keys: ['ruffles'] },
    { tag: 'cheetos', keys: ['cheetos'] },
    { tag: 'sabritas', keys: ['sabritas'] },
    { tag: 'coca', keys: ['cocacola', 'coca'] },
    { tag: 'pepsi', keys: ['pepsi'] },
  ];
  let titleTag = '';
  let urlTag = '';
  for (const m of markers) {
    if (!titleTag && m.keys.some((k) => t.includes(normalize(k)))) {
      titleTag = m.tag;
    }
    if (!urlTag && m.keys.some((k) => u.includes(normalize(k)))) {
      urlTag = m.tag;
    }
  }
  return Boolean(titleTag && urlTag && titleTag !== urlTag);
}

async function main() {
  requireEnv();
  await connectDB();
  const promos = await Promocion.find({
    origen: 'oficial',
    imagen: { $nin: [null, ''] },
  })
    .select('_id nombre imagen')
    .lean();

  let cleared = 0;
  for (const p of promos) {
    if (!imageConflictsWithTitle(p.nombre, p.imagen)) continue;
    await Promocion.updateOne({ _id: p._id }, { $set: { imagen: '' } });
    cleared += 1;
    console.log('cleared', String(p._id), (p.nombre || '').slice(0, 60));
  }
  console.log(JSON.stringify({ scanned: promos.length, cleared }));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
