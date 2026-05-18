import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/index.js';
import * as controller from './generation.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', controller.create);
router.get('/', controller.listByUser);
router.get('/:id', controller.getById);
router.post('/:id/regenerate', controller.regenerate);
router.delete('/:id', controller.deleteGeneration);

export default router;
