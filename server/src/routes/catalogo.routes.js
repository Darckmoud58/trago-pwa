import { Router } from 'express';
import {
  getPromo,
  listNegocios,
  listPromoSucursales,
  listPromos,
  nearBranches,
  nearbyPromos,
} from '../controllers/catalogo.controller.js';
import { attachViewerAge } from '../middleware/viewerAge.js';

const router = Router();

router.get('/promociones', attachViewerAge, listPromos);
router.get('/promociones/cerca', attachViewerAge, nearbyPromos);
router.get('/promociones/:promoId', attachViewerAge, getPromo);
router.get('/negocios', listNegocios);
router.get('/sucursales/cerca', nearBranches);
router.get('/promociones/:promoId/sucursales', attachViewerAge, listPromoSucursales);

export default router;
