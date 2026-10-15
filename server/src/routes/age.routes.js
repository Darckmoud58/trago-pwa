import { Router } from 'express';
import { ageStatus, declareAge } from '../controllers/age.controller.js';

const router = Router();

router.post('/declare', declareAge);
router.get('/status', ageStatus);

export default router;
