import { Router } from 'express';
import {
  getPromo,
  listNegocios,
  listPromoSucursales,
  listPromos,
  nearBranches,
  nearbyPromos,
} from '../controllers/catalogo.controller.js';

const router = Router();

router.get('/promociones', listPromos);
router.get('/promociones/cerca', nearbyPromos);
router.get('/promociones/:promoId', getPromo);
router.get('/negocios', listNegocios);
router.get('/sucursales/cerca', nearBranches);
router.get('/promociones/:promoId/sucursales', listPromoSucursales);

export default router;
