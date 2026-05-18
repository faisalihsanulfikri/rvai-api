import { Router } from 'express';
import passport from 'passport';
import { handleGoogleCallback, getCurrentUser, logout } from './auth.controller.js';
import { authMiddleware } from '../../shared/middleware/index.js';

const router = Router();

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/?error=google_auth_failed'
  }),
  handleGoogleCallback
);

router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', logout);

export default router;
