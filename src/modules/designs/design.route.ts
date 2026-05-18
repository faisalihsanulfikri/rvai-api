import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/index.js';
import * as controller from './design.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', controller.listByUser);

export default router;
