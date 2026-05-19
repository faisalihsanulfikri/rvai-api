import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../shared/middleware/index.js';
import * as controller from './generation.controller.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(authMiddleware);

router.post('/', upload.single('referenceImage'), controller.create);
router.get('/', controller.listByUser);
router.get('/:id', controller.getById);
router.post('/:id/regenerate', upload.single('referenceImage'), controller.regenerate);
router.delete('/:id', controller.deleteGeneration);

export default router;
