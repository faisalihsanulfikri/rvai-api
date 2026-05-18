import { GenerationModel } from './generation.model.js';
import { deleteImage } from './image-storage.service.js';
import { CreateGenerationRequest, RegenerateRequest } from './generation.types.js';
import { createDesign, findDesignForUser } from '../designs/index.js';

export async function createGeneration(
  userId: string,
  data: CreateGenerationRequest
) {
  const { prompt, designId, style, aspectRatio } = data;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required');
  }

  let resolvedDesignId: string;
  if (designId) {
    const existing = await findDesignForUser(designId, userId);
    if (existing) {
      resolvedDesignId = existing._id.toString();
    } else {
      const created = await createDesign(userId, prompt);
      resolvedDesignId = created._id.toString();
    }
  } else {
    const created = await createDesign(userId, prompt);
    resolvedDesignId = created._id.toString();
  }

  const generation = await GenerationModel.create({
    userId,
    designId: resolvedDesignId,
    originalPrompt: prompt,
    finalPrompt: prompt,
    status: 'pending',
    style,
    aspectRatio,
  });

  return generation;
}

export async function getGenerationsByUser(userId: string) {
  return GenerationModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getGenerationById(id: string, userId: string) {
  const generation = await GenerationModel.findOne({
    _id: id,
    userId,
  });

  if (!generation) {
    throw new Error('Generation not found');
  }

  return generation;
}

export async function updateGenerationStatus(
  id: string,
  updates: Partial<any>
) {
  return GenerationModel.findByIdAndUpdate(id, updates, { new: true });
}

export async function regenerateDesign(
  id: string,
  userId: string,
  data: RegenerateRequest
) {
  const { prompt, style, aspectRatio } = data;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required');
  }

  const generation = await GenerationModel.findOne({ _id: id, userId });

  if (!generation) {
    throw new Error('Generation not found');
  }

  generation.originalPrompt = prompt;
  generation.finalPrompt = prompt;
  generation.status = 'pending';
  if (style) generation.style = style;
  if (aspectRatio) generation.aspectRatio = aspectRatio;

  await generation.save();
  return generation;
}

export async function deleteGeneration(id: string, userId: string) {
  const generation = await GenerationModel.findOne({ _id: id, userId });

  if (!generation) {
    throw new Error('Generation not found');
  }

  if (generation.imageFilename) {
    await deleteImage(generation.imageFilename);
  }

  await GenerationModel.deleteOne({ _id: id });
}
