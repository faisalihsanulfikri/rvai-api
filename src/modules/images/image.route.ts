import { Router } from 'express';
import * as controller from './image.controller.js';

const router = Router();

router.get('/:filename', controller.serveImage);

export default router;
