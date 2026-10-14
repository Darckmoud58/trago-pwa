import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireAdmin, requireChain } from '../middleware/roles.js';
import Empresa from '../models/Empresa.js';
import {
  blockUserReports,
  createPromo,
  createSucursal,
  getCadenaMe,
  listVigencia,
  reafirmarVigencia,
  registerCadena,
  setParticipacion,
  setPromoSucursales,
  updatePromo,
  verifyEmpresa,
} from '../controllers/cadena.controller.js';

const router = Router();

async function attachOwnEmpresa(req, _res, next) {
  try {
    req.empresa = await Empresa.findOne({
      id_dueno: req.userId,
      estatus: 'activo',
    }).lean();
    next();
  } catch (e) {
    next(e);
  }
}

/** Cualquier usuario autenticado puede registrar su primera cadena. */
router.post('/registro', auth, registerCadena);

/** Estado del panel: cualquier sesión (sin cadena → empresa null). */
router.get('/me', auth, attachOwnEmpresa, getCadenaMe);

/** Escritura: dueño / rol empresa|chain|admin. */
router.post('/sucursales', auth, requireChain, createSucursal);
router.post('/promociones', auth, requireChain, createPromo);
router.put('/promociones/:id', auth, requireChain, updatePromo);
router.post(
  '/promociones/:id/sucursales',
  auth,
  requireChain,
  setPromoSucursales
);

/** Moderación de vigencia en piso */
router.get('/vigencia', auth, requireChain, listVigencia);
router.post('/vigencia/reafirmar', auth, requireChain, reafirmarVigencia);
router.post('/vigencia/participacion', auth, requireChain, setParticipacion);

/** Admin */
router.post('/admin/verificar', auth, requireAdmin, verifyEmpresa);
router.post('/admin/bloquear-reportes', auth, requireAdmin, blockUserReports);

export default router;
