import { Request, Response } from 'express';
import { getImageBuffer } from './image.service.js';
import { detectMimeFromBuffer } from '../generations/image-storage.service.js';

export async function serveImage(req: Request, res: Response) {
  try {
    const { filename } = req.params;

    // Security: only allow alphanumeric and common file extensions
    if (!/^[a-zA-Z0-9\-_.]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const buffer = await getImageBuffer(filename);
    res.type(detectMimeFromBuffer(buffer));
    res.send(buffer);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
}
