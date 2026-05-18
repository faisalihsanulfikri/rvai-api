import { Request, Response } from 'express';
import { getUserById, verifyAndCreateUserFromGoogleToken } from './auth.service.js';

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

export async function verifyGoogleToken(
  req: Request<any, any, { token: string }>,
  res: Response
) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google token is required' });
    }

    const result = await verifyAndCreateUserFromGoogleToken(token);

    res.json({
      id: 'auth',
      status: 'success',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(401).json({ error: 'Invalid or expired Google token' });
  }
}
