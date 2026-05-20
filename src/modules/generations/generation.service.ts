import { GenerationModel } from './generation.model.js';
import { deleteImage, saveInputImage } from './image-storage.service.js';
import { CreateGenerationRequest } from './generation.types.js';
import { createDesign, findDesignForUser } from '../designs/index.js';

export async function createGeneration(
  userId: string,
  data: CreateGenerationRequest
) {
  const { prompt, designId, style, room, aspectRatio, inputImage } = data;

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

  const inputImageFilename = inputImage ? await saveInputImage(inputImage) : undefined;

  const generation = await GenerationModel.create({
    userId,
    designId: resolvedDesignId,
    originalPrompt: prompt,
    finalPrompt: prompt,
    status: 'pending',
    style,
    room,
    aspectRatio,
    inputImageFilename,
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

export async function deleteGeneration(id: string, userId: string) {
  const generation = await GenerationModel.findOne({ _id: id, userId });

  if (!generation) {
    throw new Error('Generation not found');
  }

  if (generation.imageFilename) {
    await deleteImage(generation.imageFilename);
  }
  if (generation.inputImageFilename) {
    await deleteImage(generation.inputImageFilename);
  }

  await GenerationModel.deleteOne({ _id: id });
}
