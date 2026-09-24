/**
 * Seed TraGo alineado al diagrama ER (traGO.1.2.drawio).
 * Uso: cd server && npm run seed
 * Base: MONGODB_DB=trago (mismo Atlas que Todo_pwa / clase).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Rol from '../models/Rol.js';
import Nivel from '../models/Nivel.js';
import Categoria from '../models/Categoria.js';
import Insignia from '../models/Insignia.js';
import Empresa from '../models/Empresa.js';
import Ubicacion from '../models/Ubicacion.js';
import Promocion from '../models/Promocion.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import Cupon from '../models/Cupon.js';
import Usuario from '../models/Usuario.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const DEMO_USER = {
  correo: 'demo@trago.app',
  password: 'TraGo123!',
  nombre: 'Demo',
  ape_paterno: 'TraGo',
  ape_materno: 'ZMG',
  edad: 25,
};

const DEMO_POLITICAS =
  'Folio ilustrativo de TraGo. La sucursal sí existe en Guadalajara; el precio y la vigencia se confirman en el local. No es una promoción oficial de la cadena.';

const rolesSeed = [
  { codigo: 'user', nombre: 'Usuario', descripcion: 'Cliente TraGo / consumidor de promociones' },
  { codigo: 'empresa', nombre: 'Empresa', descripcion: 'Operador de negocio / cadena' },
  { codigo: 'admin', nombre: 'Admin', descripcion: 'Administrador de la plataforma' },
];

const nivelesSeed = [
  {
    nombre: 'Bronce',
    descripcion: 'Nivel inicial al registrarse',
    pts_min: 0,
    pts_max: 99,
    beneficio: 'Acceso a promociones básicas',
  },
  {
    nombre: 'Plata',
    descripcion: 'Usuario frecuente',
    pts_min: 100,
    pts_max: 299,
    beneficio: 'Cupones exclusivos y 5% extra en puntos',
  },
  {
    nombre: 'Oro',
    descripcion: 'Usuario leal',
    pts_min: 300,
    pts_max: 599,
    beneficio: 'Prioridad en canjes y acceso anticipado',
  },
  {
    nombre: 'Platino',
    descripcion: 'Top TraGo',
    pts_min: 600,
    pts_max: null,
    beneficio: 'Beneficios premium y insignias especiales',
  },
];

const categoriasSeed = [
  { nombre: 'Licorería', descripcion: 'Vinos, destilados y licores', ambito: 'empresa' },
  { nombre: 'Conveniencia', descripcion: 'Tiendas de conveniencia', ambito: 'empresa' },
  { nombre: 'Restaurante', descripcion: 'Comida y restaurantes', ambito: 'empresa' },
  { nombre: 'Bar', descripcion: 'Bares y nightlife', ambito: 'empresa' },
  { nombre: 'Café', descripcion: 'Cafeterías', ambito: 'empresa' },
  { nombre: 'Retail', descripcion: 'Comercio y coleccionables', ambito: 'empresa' },
  { nombre: '2x1', descripcion: 'Promociones dos por uno', ambito: 'promocion' },
  { nombre: 'Happy hour', descripcion: 'Horario especial de barra', ambito: 'promocion' },
  { nombre: 'Cumpleaños', descripcion: 'Promos de cumpleaños', ambito: 'promocion' },
  { nombre: 'Descuento', descripcion: 'Porcentaje o monto de descuento', ambito: 'promocion' },
];

const insigniasSeed = [
  { nombre: 'Primer canje', descripcion: 'Canjeaste tu primera promoción', imagen: 'ticket', puntos: 10 },
  { nombre: 'Explorador ZMG', descripcion: 'Visitaste 5 ubicaciones distintas', imagen: 'map', puntos: 25 },
  { nombre: 'Noctámbulo', descripcion: 'Canjeaste 3 promos nocturnas', imagen: 'moon', puntos: 30 },
  { nombre: 'Crítico', descripcion: 'Publicaste 5 reseñas', imagen: 'star', puntos: 20 },
  { nombre: 'Cumpleañero', descripcion: 'Canjeaste una promo de cumpleaños', imagen: 'cake', puntos: 15 },
];

const empresasSeed = [
  {
    slug: 'la-europea',
    nombre: 'La Europea',
    descripcion: 'Cadena real. Sucursales Andares y Chapalita en la ZMG.',
    imagen: 'LE',
    cat: 'Licorería',
    sitio_web: 'https://www.laeuropea.com.mx',
  },
  {
    slug: 'oxxo',
    nombre: 'OXXO',
    descripcion: 'Sucursales reales en Americana y Chapultepec, Guadalajara.',
    imagen: 'OX',
    cat: 'Conveniencia',
    sitio_web: 'https://www.oxxo.com',
  },
  {
    slug: 'karne-garibaldi',
    nombre: 'Karne Garibaldi',
    descripcion: 'Restaurante emblemático en Mexicaltzingo.',
    imagen: 'KG',
    cat: 'Restaurante',
    sitio_web: 'https://www.karnegaribaldi.com.mx',
  },
  {
    slug: 'gallo-altanero',
    nombre: 'El Gallo Altanero',
    descripcion: 'Av. México, Ladrón de Guevara.',
    imagen: 'GA',
    cat: 'Bar',
    sitio_web: 'https://www.instagram.com/elgalloaltanero/',
  },
  {
    slug: 'starbucks',
    nombre: 'Starbucks',
    descripcion: 'Chapultepec, Americana.',
    imagen: 'SB',
    cat: 'Café',
    sitio_web: 'https://www.starbucks.com.mx',
  },
];

const ubicacionesSeed = [
  {
    slug: 'europea-andares',
    empresaSlug: 'la-europea',
    nombre: 'La Europea Andares',
    calle: 'Av. Acueducto',
    num_ext: '6075',
    colonia: 'Puerta de Hierro',
    municipio: 'Zapopan',
    long: -103.4116,
    lat: 20.7108,
    horario: '11:00 – 21:00',
  },
  {
    slug: 'europea-chapalita',
    empresaSlug: 'la-europea',
    nombre: 'La Europea Chapalita',
    calle: 'Av. Guadalupe',
    num_ext: '1675',
    colonia: 'Chapalita',
    municipio: 'Zapopan',
    long: -103.4008,
    lat: 20.6664,
    horario: '10:00 – 20:00',
  },
  {
    slug: 'oxxo-chapultepec',
    empresaSlug: 'oxxo',
    nombre: 'OXXO Chapultepec',
    calle: 'Av. Chapultepec',
    num_ext: '120',
    colonia: 'Americana',
    municipio: 'Guadalajara',
    long: -103.3762,
    lat: 20.6738,
    horario: '24 h',
  },
  {
    slug: 'garibaldi-mexicaltzingo',
    empresaSlug: 'karne-garibaldi',
    nombre: 'Karne Garibaldi',
    calle: 'Calle Garibaldi',
    num_ext: '1306',
    colonia: 'Mexicaltzingo',
    municipio: 'Guadalajara',
    long: -103.3524,
    lat: 20.6638,
    horario: '08:00 – 18:00',
  },
  {
    slug: 'gallo-mexico',
    empresaSlug: 'gallo-altanero',
    nombre: 'El Gallo Altanero',
    calle: 'Av. México',
    num_ext: '2770',
    colonia: 'Ladrón de Guevara',
    municipio: 'Guadalajara',
    long: -103.3768,
    lat: 20.6846,
    horario: '18:00 – 02:00',
  },
  {
    slug: 'starbucks-chapultepec',
    empresaSlug: 'starbucks',
    nombre: 'Starbucks Chapultepec',
    calle: 'Av. Chapultepec',
    num_ext: '238',
    colonia: 'Americana',
    municipio: 'Guadalajara',
    long: -103.3751,
    lat: 20.6741,
    horario: '07:00 – 22:00',
  },
];

const promosSeed = [
  {
    slug: 'europea-3x2-mezcal',
    empresaSlug: 'la-europea',
    cat: 'Descuento',
    nombre: '3x2 en mezcal seleccionado',
    descripcion: 'Botella 750 ml · Andares y Chapalita',
    alcohol: true,
    nocturno: true,
    audiencia: 'adulto',
    destacada: true,
    puntos: 15,
    ubicaciones: ['europea-andares', 'europea-chapalita'],
    imagen:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1d?w=900&h=600&fit=crop',
  },
  {
    slug: 'oxxo-2x1-cerveza',
    empresaSlug: 'oxxo',
    cat: '2x1',
    nombre: '2x1 en cerveza lata',
    descripcion: '18:00 a 22:00 · Americana',
    alcohol: true,
    nocturno: true,
    audiencia: 'adulto',
    destacada: true,
    puntos: 10,
    ubicaciones: ['oxxo-chapultepec'],
    imagen:
      'https://images.unsplash.com/photo-1608270586620-248804b7740e?w=900&h=600&fit=crop',
  },
  {
    slug: 'garibaldi-arrachera',
    empresaSlug: 'karne-garibaldi',
    cat: '2x1',
    nombre: 'Arrachera 2x1 al mediodía',
    descripcion: 'De 13:00 a 16:00 · Mexicaltzingo',
    alcohol: false,
    nocturno: false,
    audiencia: 'todos',
    destacada: true,
    puntos: 12,
    ubicaciones: ['garibaldi-mexicaltzingo'],
    imagen:
      'https://images.unsplash.com/photo-1558030006-450675393462?w=900&h=600&fit=crop',
  },
  {
    slug: 'starbucks-cumple',
    empresaSlug: 'starbucks',
    cat: 'Cumpleaños',
    nombre: 'Bebida de cumpleaños',
    descripcion: 'Grande de regalo el día de tu cumple',
    alcohol: false,
    nocturno: false,
    audiencia: 'todos',
    cumpleanos: true,
    destacada: true,
    puntos: 20,
    ubicaciones: ['starbucks-chapultepec'],
    imagen:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&h=600&fit=crop',
  },
  {
    slug: 'gallo-happy-hour',
    empresaSlug: 'gallo-altanero',
    cat: 'Happy hour',
    nombre: 'Happy hour de barra',
    descripcion: '18:00 a 21:00 · Av. México',
    alcohol: true,
    nocturno: true,
    audiencia: 'adulto',
    destacada: true,
    puntos: 18,
    ubicaciones: ['gallo-mexico'],
    imagen:
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=900&h=600&fit=crop',
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI en server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'trago' });
  console.log('Conectado a', mongoose.connection.name);

  await Promise.all([
    Rol.deleteMany({}),
    Nivel.deleteMany({}),
    Categoria.deleteMany({}),
    Insignia.deleteMany({}),
    Empresa.deleteMany({}),
    Ubicacion.deleteMany({}),
    Promocion.deleteMany({}),
    PromoUbicacion.deleteMany({}),
    Cupon.deleteMany({}),
    Usuario.deleteMany({ correo: DEMO_USER.correo }),
  ]);

  const [roles, niveles, categorias, insignias] = await Promise.all([
    Rol.insertMany(rolesSeed),
    Nivel.insertMany(nivelesSeed),
    Categoria.insertMany(categoriasSeed),
    Insignia.insertMany(insigniasSeed),
  ]);

  const catByNombre = Object.fromEntries(categorias.map((c) => [c.nombre, c]));

  const empresas = await Empresa.insertMany(
    empresasSeed.map((e) => ({
      slug: e.slug,
      nombre: e.nombre,
      descripcion: e.descripcion,
      imagen: e.imagen,
      sitio_web: e.sitio_web,
      id_categoria: catByNombre[e.cat]?._id || null,
      estatus: 'activo',
    }))
  );
  const empBySlug = Object.fromEntries(empresas.map((e) => [e.slug, e]));

  const ubicaciones = await Ubicacion.insertMany(
    ubicacionesSeed.map((u) => {
      const emp = empBySlug[u.empresaSlug];
      return {
        slug: u.slug,
        nombre: u.nombre,
        calle: u.calle,
        num_ext: u.num_ext,
        colonia: u.colonia,
        municipio: u.municipio,
        estado: 'Jalisco',
        lat: u.lat,
        long: u.long,
        location: { type: 'Point', coordinates: [u.long, u.lat] },
        id_empresa: emp._id,
        horario: u.horario,
        estatus: 'activo',
      };
    })
  );
  const ubiBySlug = Object.fromEntries(ubicaciones.map((u) => [u.slug, u]));

  const inicia = new Date('2026-08-01T06:00:00.000Z');
  const termina = new Date('2026-12-31T23:59:59.000Z');

  const promociones = await Promocion.insertMany(
    promosSeed.map((p) => {
      const emp = empBySlug[p.empresaSlug];
      return {
        slug: p.slug,
        nombre: p.nombre,
        descripcion: p.descripcion,
        politicas: DEMO_POLITICAS,
        imagen: p.imagen,
        origen: 'demo',
        puntos: p.puntos,
        id_empresa: emp._id,
        id_categoria: catByNombre[p.cat]?._id || null,
        inicia_en: inicia,
        termina_en: termina,
        alcohol: p.alcohol,
        nocturno: p.nocturno,
        cumpleanos: !!p.cumpleanos,
        audiencia: p.audiencia,
        destacada: p.destacada,
        estatus: 'activo',
      };
    })
  );
  const promoBySlug = Object.fromEntries(promociones.map((p) => [p.slug, p]));

  const links = [];
  const cupones = [];
  for (const p of promosSeed) {
    const promo = promoBySlug[p.slug];
    for (const uSlug of p.ubicaciones) {
      const ubi = ubiBySlug[uSlug];
      links.push({
        id_promo: promo._id,
        id_ubicacion: ubi._id,
        activa_oficial: true,
        reportes_vigente: 5,
        reportes_caduco: 1,
      });
    }
    cupones.push({
      codigo: `TRAGO-${p.slug.toUpperCase().slice(0, 12)}`,
      qr_codigo: `qr://${p.slug}`,
      tipo_codigo: 'qr',
      valor: 1,
      tipo_valor: 'producto',
      existencia: 100,
      max_per: 1,
      verificado: true,
      estatus: 'activo',
      id_promo: promo._id,
      fuente: 'seed-demo',
    });
  }

  await PromoUbicacion.insertMany(links);
  await Cupon.insertMany(cupones);

  const roleUser = roles.find((r) => r.codigo === 'user');
  const nivelBronce = niveles.find((n) => n.nombre === 'Bronce');
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  await Usuario.create({
    nombre: DEMO_USER.nombre,
    ape_paterno: DEMO_USER.ape_paterno,
    ape_materno: DEMO_USER.ape_materno,
    correo: DEMO_USER.correo,
    password: passwordHash,
    edad: DEMO_USER.edad,
    puntos: 40,
    estatus: 'activo',
    id_rol: roleUser?._id || null,
    id_nivel: nivelBronce?._id || null,
    fecha_nacimiento: new Date('2000-01-15'),
  });

  // Índice geo: crear solo si no existe (puede llamarse geo_ubicaciones o location_2dsphere)
  try {
    await Ubicacion.collection.createIndex({ location: '2dsphere' }, { name: 'geo_ubicaciones' });
  } catch (err) {
    if (!/already exists/i.test(err.message)) throw err;
  }

  console.log('Seed ER OK en', mongoose.connection.name);
  console.log(`  roles:            ${roles.length}`);
  console.log(`  niveles:          ${niveles.length}`);
  console.log(`  categorias:       ${categorias.length}`);
  console.log(`  insignias:        ${insignias.length}`);
  console.log(`  empresas:         ${empresas.length}`);
  console.log(`  ubicaciones:      ${ubicaciones.length}`);
  console.log(`  promociones:      ${promociones.length}`);
  console.log(`  promo_ubicaciones:${links.length}`);
  console.log(`  cupones:          ${cupones.length}`);
  console.log(`  usuario demo:     ${DEMO_USER.correo} / ${DEMO_USER.password}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed falló:', err.message);
  process.exit(1);
});
