import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { list, remove, sync, upsert } from '../controllers/favoritos.controller.js';

const router = Router();
router.use(auth);
router.get('/', list);
router.post('/sync', sync);
router.put('/:type/:targetId', upsert);
router.delete('/:type/:targetId', remove);

export default router;
