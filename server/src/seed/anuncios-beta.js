/**
 * Beta de pauta propia: empresa demo + suscripción activa + anuncios con media local.
 *
 * Uso:
 *   cd server && npm run seed:anuncios-beta -- --yes
 *
 * Media en trago_web/public/ads-beta/ (paths relativos; el front los sirve).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Empresa from '../models/Empresa.js';
import Anuncio from '../models/Anuncio.js';
import Suscripcion from '../models/Suscripcion.js';

dotenv.config();

const SLUG = 'trago-beta-ads';
const ALLOWED_DBS = new Set(['trago', 'trago_dev', 'trago_test']);

const ADS = [
  {
    slot: 'home_rail',
    titulo: 'Beta · Noche en la ciudad',
    copy: 'Creativo de prueba con video. Etiquetado Patrocinado — no es promo oficial.',
    imagen_url: '/ads-beta/night-poster.jpg',
    video_url: '/ads-beta/night.mp4',
    url_destino: 'https://trago.app',
  },
  {
    slot: 'explorar_mid',
    titulo: 'Beta · Fin de semana',
    copy: 'Slot Explorar — video demo para validar impresiones y clics.',
    imagen_url: '/ads-beta/weekend-poster.jpg',
    video_url: '/ads-beta/weekend.mp4',
    url_destino: 'https://trago.app',
  },
  {
    slot: 'cerca_top',
    titulo: 'Beta · Cerca de ti',
    copy: 'Aparece arriba en Cerca. Sustituye por creativo de cadena real en el piloto.',
    imagen_url: '/ads-beta/near-poster.jpg',
    video_url: '/ads-beta/near.mp4',
    url_destino: 'https://trago.app',
  },
  {
    slot: 'side_left',
    titulo: 'Beta · Riel izquierdo',
    copy: 'Suscripción de sucursales + anuncio propio.',
    imagen_url: '/ads-beta/side-left-poster.jpg',
    video_url: '/ads-beta/side-left.mp4',
    url_destino: 'https://trago.app',
  },
  {
    slot: 'side_right',
    titulo: 'Beta · Riel derecho',
    copy: 'Hueco desktop: tu creativo aquí.',
    imagen_url: '/ads-beta/side-right-poster.jpg',
    video_url: '/ads-beta/side-right.mp4',
    url_destino: 'https://trago.app',
  },
];

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

async function main() {
  const yes = process.argv.includes('--yes');
  if (!yes) {
    console.error('Confirma con: npm run seed:anuncios-beta -- --yes');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB || dbNameFromUri(uri) || 'trago';
  if (!ALLOWED_DBS.has(dbName)) {
    console.error(`DB no permitida para seed beta: ${dbName}`);
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName });
  console.log(`Conectado a ${dbName}`);

  let empresa = await Empresa.findOne({ slug: SLUG });
  if (!empresa) {
    empresa = await Empresa.create({
      nombre: 'TraGo Beta Ads',
      slug: SLUG,
      descripcion:
        'Anunciante de prueba para pauta propia (video). No es cadena real.',
      plan: 'freemium',
      plan_pauta: 'basic',
      verificada: false,
      estatus: 'activo',
      sitio_web: 'https://trago.app',
    });
    console.log('Empresa creada:', empresa._id.toString());
  } else {
    empresa.plan_pauta = 'basic';
    empresa.estatus = 'activo';
    await empresa.save();
    console.log('Empresa reusada:', empresa._id.toString());
  }

  const now = new Date();
  const termina = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await Suscripcion.updateMany(
    { id_empresa: empresa._id, estatus: { $in: ['pending', 'activo'] } },
    { $set: { estatus: 'cancelado', activo: false } }
  );

  const sub = await Suscripcion.create({
    id_empresa: empresa._id,
    plan: 'basic',
    inicia: now,
    termina,
    activo: true,
    estatus: 'activo',
    origen: 'manual',
    notas: 'Seed beta anuncios locales · 30 días',
  });
  console.log('Suscripción activa:', sub._id.toString());

  const deleted = await Anuncio.deleteMany({ id_empresa: empresa._id });
  console.log(`Anuncios previos borrados: ${deleted.deletedCount}`);

  const created = [];
  for (const ad of ADS) {
    const doc = await Anuncio.create({
      id_empresa: empresa._id,
      titulo: ad.titulo,
      copy: ad.copy,
      imagen_url: ad.imagen_url,
      video_url: ad.video_url,
      url_destino: ad.url_destino,
      inicia: now,
      termina,
      zonas: ['gdl', 'all'],
      slot: ad.slot,
      estatus: 'activo',
      alcohol: false,
    });
    created.push({ slot: doc.slot, id: doc._id.toString(), titulo: doc.titulo });
  }

  console.log('Anuncios beta activos:');
  for (const row of created) {
    console.log(`  · ${row.slot}: ${row.titulo} (${row.id})`);
  }
  console.log(
    '\nVerifica: GET /api/anuncios/serving?slot=home_rail&zona=gdl'
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
