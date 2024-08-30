import express from 'express';
import { uploadMeasure, confirmMeasure, listMeasures } from '../controllers/MeasureController';
import { validateMeasure } from '../middleware/MeasureMiddleware'

const router = express.Router();

router.post('/upload', validateMeasure, uploadMeasure);
router.patch('/confirm', confirmMeasure);
router.get('/:customer_code/list', listMeasures);

export default router;
