import { Request, Response } from 'express';
import * as designService from './design.service.js';

export async function listByUser(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const designs = await designService.listDesignsByUser(userId);

    res.json(
      designs.map((d: any) => ({
        id: d._id,
        userId: d.userId,
        firstPrompt: d.firstPrompt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
}
