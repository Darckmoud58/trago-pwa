import crypto from 'node:crypto';
import Ubicacion from '../models/Ubicacion.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import { distanceMeters } from '../lib/validity.js';

/**
 * Persiste sucursales OSM asociadas a una empresa conocida.
 * NO crea vínculos promo↔sucursal (eso inventaría participación).
 */
export async function upsertCompanyBranchesFromOsm(branches = []) {
  const saved = [];
  for (const branch of branches) {
    if (!branch?.id_empresa && !branch?.companyId) continue;
    const empresaId = branch.id_empresa || branch.companyId;
    const lat = Number(branch.lat);
    const lng = Number(branch.lng ?? branch.long);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const osmKey =
      branch.osmType && branch.osmId
        ? `${branch.osmType}-${branch.osmId}`
        : crypto
            .createHash('sha1')
            .update(`${empresaId}:${lat.toFixed(5)}:${lng.toFixed(5)}`)
            .digest('hex')
            .slice(0, 12);
    const slug = `osm-${osmKey}`;
    const calle =
      [branch.street, branch.number].filter(Boolean).join(' ') ||
      branch.nombre ||
      branch.name ||
      'Sucursal';

    const doc = await Ubicacion.findOneAndUpdate(
      { slug },
      {
        $set: {
          nombre: branch.nombre || branch.name || calle,
          calle,
          colonia: branch.suburb || branch.colonia || '',
          municipio: branch.city || branch.municipio || 'Guadalajara',
          estado: 'Jalisco',
          lat,
          long: lng,
          location: { type: 'Point', coordinates: [lng, lat] },
          id_empresa: empresaId,
          horario: branch.hours || branch.horario || '',
          estatus: 'activo',
        },
        $setOnInsert: { slug },
      },
      { upsert: true, new: true }
    );
    saved.push({
      ...doc.toObject(),
      distanceMeters: branch.distanceMeters,
      osmUrl: branch.osmUrl,
    });
  }
  return saved;
}

/**
 * Crea/actualiza vínculos promo↔sucursal.
 * origen_vinculo: empresa | fuente | manual
 * especificado_por_fuente: solo true si la página oficial nombró la sucursal.
 */
export async function linkPromoToUbicaciones(
  promoId,
  ubicacionIds,
  {
    origenVinculo = 'empresa',
    especificadoPorFuente = false,
    replace = false,
  } = {}
) {
  const ids = [...new Set((ubicacionIds || []).map(String))].filter(Boolean);
  if (replace) {
    await PromoUbicacion.deleteMany({ id_promo: promoId });
  }
  if (!ids.length) return [];

  const ops = ids.map((id_ubicacion) => ({
    updateOne: {
      filter: { id_promo: promoId, id_ubicacion },
      update: {
        $set: {
          activa_oficial: true,
          origen_vinculo: origenVinculo,
          especificado_por_fuente: Boolean(especificadoPorFuente),
        },
        $setOnInsert: {
          id_promo: promoId,
          id_ubicacion,
          reportes_vigente: 0,
          reportes_caduco: 0,
        },
      },
      upsert: true,
    },
  }));
  await PromoUbicacion.bulkWrite(ops, { ordered: false });
  return PromoUbicacion.find({
    id_promo: promoId,
    id_ubicacion: { $in: ids },
  }).lean();
}

/**
 * Intenta emparejar texto de la fuente con sucursales ya conocidas de la empresa.
 * Solo vincula si hay coincidencia clara de nombre (≥6 chars). Nunca inventa.
 */
export async function linkOfficialPromoIfSourceNamesBranch(promo, companyId) {
  const haystack = `${promo.nombre || ''} ${promo.descripcion || ''} ${promo.politicas || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const ubicaciones = await Ubicacion.find({
    id_empresa: companyId,
    estatus: 'activo',
  })
    .limit(200)
    .lean();

  const matched = [];
  for (const u of ubicaciones) {
    const name = String(u.nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (name.length < 6) continue;
    if (haystack.includes(name)) matched.push(u._id);
  }

  if (!matched.length) return { linked: 0, especificado: false };

  await linkPromoToUbicaciones(promo._id, matched, {
    origenVinculo: 'fuente',
    especificadoPorFuente: true,
    replace: false,
  });
  return { linked: matched.length, especificado: true };
}

export function enrichBranchesWithDistance(ubicaciones, userGeo) {
  if (!userGeo || !Number.isFinite(userGeo.lat) || !Number.isFinite(userGeo.lng)) {
    return ubicaciones.map((u) => ({ ...u, distanceMeters: null }));
  }
  return ubicaciones
    .map((u) => {
      const lat = Number(u.lat);
      const lng = Number(u.lng ?? u.long);
      const d =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? Math.round(distanceMeters(userGeo, { lat, lng }))
          : null;
      return { ...u, distanceMeters: d };
    })
    .sort((a, b) => {
      if (a.distanceMeters == null) return 1;
      if (b.distanceMeters == null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });
}

export function vinculoMeta(linkedCount, fuenteEspecificada) {
  if (linkedCount > 0 && fuenteEspecificada) {
    return {
      especificado: true,
      mensaje: 'Sucursales indicadas por la fuente o por la cadena.',
    };
  }
  if (linkedCount > 0) {
    return {
      especificado: true,
      mensaje: 'Sucursales asignadas por la cadena (participantes).',
    };
  }
  return {
    especificado: false,
    mensaje:
      'La fuente oficial no especifica en cuál sucursal aplica. No inventamos participación.',
  };
}
