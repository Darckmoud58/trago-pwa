import Promocion from '../models/Promocion.js';
import Sucursal from '../models/Sucursal.js';
import Negocio from '../models/Negocio.js';
import PromoSucursal from '../models/PromoSucursal.js';

/** Listado público de promociones activas (demo API estilo clase). */
export async function listPromos(_req, res) {
  try {
    const promos = await Promocion.find({ active: { $ne: false } })
      .sort({ featured: -1, endsAt: 1 })
      .limit(100)
      .lean();
    res.json({ count: promos.length, promos });
  } catch (e) {
    console.error('listPromos:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

/** Sucursales cercanas — $geoNear (lng, lat). */
export async function nearBranches(req, res) {
  try {
    const lng = Number(req.query.lng);
    const lat = Number(req.query.lat);
    const maxMeters = Number(req.query.maxMeters || 5000);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({ message: 'lng y lat requeridos' });
    }

    const branches = await Sucursal.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: maxMeters,
          spherical: true,
          query: { active: { $ne: false } },
        },
      },
      { $limit: 40 },
    ]);

    res.json({ count: branches.length, branches });
  } catch (e) {
    console.error('nearBranches:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function listNegocios(_req, res) {
  try {
    const negocios = await Negocio.find().limit(100).lean();
    res.json({ count: negocios.length, negocios });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function listPromoSucursales(req, res) {
  try {
    const { promoId } = req.params;
    const links = await PromoSucursal.find({ promoId }).lean();
    res.json({ count: links.length, links });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}
