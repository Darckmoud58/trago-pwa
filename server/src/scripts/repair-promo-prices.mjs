/**
 * Repara precios / títulos de promociones oficiales ya importadas.
 * Idempotente. Por defecto solo simula (--dry-run implícito salvo --apply).
 *
 *   cd server && node src/scripts/repair-promo-prices.mjs
 *   cd server && node src/scripts/repair-promo-prices.mjs --apply
 *
 * No escribe en producción sin --apply. Pide confirmación de DB permitida.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Promocion from '../models/Promocion.js';
import {
  parsePromoPrice,
  resolvePromoPrice,
} from '../lib/promoPrice.js';
import {
  classifyCatalogEntry,
  sanitizePromoTitle,
} from '../lib/catalogQuality.js';

dotenv.config();

const ALLOWED_DBS = new Set(['trago', 'trago_dev', 'trago_test']);

function dbNameFromUri(uri) {
  try {
    const u = new URL(uri);
    const path = (u.pathname || '').replace(/^\//, '');
    if (path) return path.split('/')[0];
  } catch {
    /* ignore */
  }
  return process.env.MONGODB_DB || '';
}

function sameNum(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.001;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI');
    process.exit(1);
  }
  const dbName = dbNameFromUri(uri) || process.env.MONGODB_DB || '';
  if (!ALLOWED_DBS.has(dbName)) {
    console.error(`DB no permitida: ${dbName}. Usa trago / trago_dev / trago_test.`);
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName });
  const rows = await Promocion.find({
    origen: 'oficial',
    estatus: { $in: ['activo', 'caduco'] },
  }).lean();

  const summary = {
    scanned: rows.length,
    priceFixes: 0,
    titleFixes: 0,
    deactivate: 0,
    unchanged: 0,
    samples: [],
  };

  for (const p of rows) {
    const title = sanitizePromoTitle(p.nombre) || p.nombre;
    const quality = classifyCatalogEntry({
      title,
      description: p.descripcion,
      price: p.precio,
      priceText: p.precio_texto,
      birthday: p.cumpleanos,
    });

    const resolved = resolvePromoPrice({
      precio: p.precio,
      precioLista: p.precio_lista,
      precioTexto: p.precio_texto,
      title,
      description: p.descripcion,
    });

    const next = {
      nombre: title,
      precio:
        resolved.modo === 'consultar' || resolved.modo === 'cargo'
          ? null
          : resolved.precio,
      precio_lista:
        resolved.modo === 'consultar' ? null : resolved.precioLista,
      precio_texto:
        resolved.modo === 'consultar'
          ? 'Consultar precio'
          : resolved.precioTexto || '',
      estatus: quality.publish ? p.estatus : 'inactivo',
    };

    const changes = [];
    if (title !== p.nombre) {
      changes.push(`nombre: "${p.nombre}" → "${title}"`);
      summary.titleFixes += 1;
    }
    if (!sameNum(next.precio, p.precio) || next.precio_texto !== (p.precio_texto || '')) {
      changes.push(
        `precio: ${p.precio}/${p.precio_texto || '∅'} → ${next.precio}/${next.precio_texto || '∅'}`
      );
      summary.priceFixes += 1;
    }
    if (next.estatus === 'inactivo' && p.estatus !== 'inactivo') {
      changes.push(`estatus → inactivo (${quality.reason})`);
      summary.deactivate += 1;
    }

    if (!changes.length) {
      summary.unchanged += 1;
      continue;
    }

    if (summary.samples.length < 25) {
      summary.samples.push({ id: String(p._id), slug: p.slug, changes });
    }

    if (apply) {
      await Promocion.updateOne({ _id: p._id }, { $set: next });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        dbName,
        ...summary,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
