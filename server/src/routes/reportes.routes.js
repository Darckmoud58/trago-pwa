import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { getMyReport, postReport } from '../controllers/reportes.controller.js';

const router = Router();

router.get('/', auth, getMyReport);
router.post('/', auth, postReport);

export default router;
