import { Router } from 'express';
import { refreshOfficial } from '../controllers/cron.controller.js';

const router = Router();

router.get('/refresh-official', refreshOfficial);
router.post('/refresh-official', refreshOfficial);

export default router;
