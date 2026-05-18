import { Request, Response, NextFunction } from 'express';
import { findOrCreateUser, generateToken, getUserById } from './auth.service.js';
import { GoogleProfile } from './auth.types.js';

export async function handleGoogleCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}?error=auth_failed`);
    }

    const profile = req.user as any;
    const googleProfile: GoogleProfile = {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails || [],
      photos: profile.photos || [],
    };

    const user = await findOrCreateUser(googleProfile);
    const token = generateToken(
      user._id.toString(),
      user.email,
      user.name
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?error=callback_failed`);
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export function logout(req: Request, res: Response) {
  res.json({ success: true });
}
