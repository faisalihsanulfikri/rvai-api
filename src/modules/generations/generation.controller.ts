import { Request, Response } from 'express';
import * as generationService from './generation.service.js';
import * as queueService from './generation.queue.js';
import { CreateGenerationRequest, RegenerateRequest } from './generation.types.js';

function fileToDataUrl(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

export async function create(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data: CreateGenerationRequest = { ...req.body };
    if (req.file) {
      data.inputImage = fileToDataUrl(req.file);
    }
    const generation = await generationService.createGeneration(userId, data);

    await queueService.queueGeneration({
      generationId: generation._id.toString(),
      designId: generation.designId,
      userId,
      originalPrompt: data.prompt,
      style: data.style,
      room: data.room,
      aspectRatio: data.aspectRatio,
      inputImageFilename: generation.inputImageFilename,
    });

    res.status(201).json({
      id: generation._id,
      userId: generation.userId,
      designId: generation.designId,
      originalPrompt: generation.originalPrompt,
      finalPrompt: generation.finalPrompt,
      status: generation.status,
      createdAt: generation.createdAt,
      updatedAt: generation.updatedAt,
    });
  } catch (error) {
    console.error('Error creating generation:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create generation',
    });
  }
}

export async function listByUser(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const generations = await generationService.getGenerationsByUser(userId);

    res.json(
      generations.map((g: any) => ({
        id: g._id,
        userId: g.userId,
        designId: g.designId,
        originalPrompt: g.originalPrompt,
        finalPrompt: g.finalPrompt,
        imageUrl: g.imageUrl,
        status: g.status,
        errorMessage: g.errorMessage,
        style: g.style,
        room: g.room,
        aspectRatio: g.aspectRatio,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Failed to fetch generations' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const generation = await generationService.getGenerationById(id, userId);

    res.json({
      id: generation._id,
      userId: generation.userId,
      designId: generation.designId,
      originalPrompt: generation.originalPrompt,
      finalPrompt: generation.finalPrompt,
      imageUrl: generation.imageUrl,
      status: generation.status,
      errorMessage: generation.errorMessage,
      style: generation.style,
      room: generation.room,
      aspectRatio: generation.aspectRatio,
      createdAt: generation.createdAt,
      updatedAt: generation.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching generation:', error);
    res.status(error instanceof Error && error.message === 'Generation not found' ? 404 : 500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch generation',
    });
  }
}

export async function regenerate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data: RegenerateRequest = { ...req.body };
    if (req.file) {
      data.inputImage = fileToDataUrl(req.file);
    }
    const generation = await generationService.regenerateDesign(id, userId, data);

    await queueService.queueGeneration({
      generationId: generation._id.toString(),
      designId: generation.designId,
      userId,
      originalPrompt: data.prompt,
      style: data.style,
      room: data.room,
      aspectRatio: data.aspectRatio,
      inputImageFilename: generation.inputImageFilename,
    });

    res.json({
      id: generation._id,
      userId: generation.userId,
      designId: generation.designId,
      originalPrompt: generation.originalPrompt,
      finalPrompt: generation.finalPrompt,
      status: generation.status,
      createdAt: generation.createdAt,
      updatedAt: generation.updatedAt,
    });
  } catch (error) {
    console.error('Error regenerating design:', error);
    res.status(error instanceof Error && error.message === 'Generation not found' ? 404 : 400).json({
      error: error instanceof Error ? error.message : 'Failed to regenerate design',
    });
  }
}

export async function deleteGeneration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await generationService.deleteGeneration(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generation:', error);
    res.status(error instanceof Error && error.message === 'Generation not found' ? 404 : 500).json({
      error: error instanceof Error ? error.message : 'Failed to delete generation',
    });
  }
}
