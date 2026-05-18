import { Router } from 'express';
import { getCurrentUser, logout, verifyGoogleToken } from './auth.controller.js';
import { authMiddleware } from '../../shared/middleware/index.js';

const router = Router();

router.post('/verify-google', verifyGoogleToken);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', logout);

export default router;
