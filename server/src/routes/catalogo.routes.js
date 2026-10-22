import { Router } from 'express';
import {
  getPromo,
  listNegocios,
  listPromoSucursales,
  listPromos,
  nearBranches,
  nearbyPromos,
  placeAddress,
} from '../controllers/catalogo.controller.js';
import { attachViewerAge } from '../middleware/viewerAge.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const cercaLimit = rateLimit({
  name: 'cerca',
  max: LIMITS.cerca.max,
  windowMs: LIMITS.cerca.windowMs,
});

const apiLimit = rateLimit({
  name: 'api',
  max: LIMITS.api.max,
  windowMs: LIMITS.api.windowMs,
});

router.get('/promociones', apiLimit, attachViewerAge, listPromos);
router.get('/promociones/cerca', cercaLimit, attachViewerAge, nearbyPromos);
router.get('/promociones/:promoId', apiLimit, attachViewerAge, getPromo);
router.get('/negocios', apiLimit, listNegocios);
router.get('/sucursales/cerca', cercaLimit, nearBranches);
router.get('/sucursales/direccion', apiLimit, placeAddress);
router.get(
  '/promociones/:promoId/sucursales',
  apiLimit,
  attachViewerAge,
  listPromoSucursales
);

export default router;
