import mongoose from 'mongoose';
import { DesignModel, DesignDocument } from './design.model.js';

export async function createDesign(userId: string, firstPrompt: string): Promise<DesignDocument> {
  return DesignModel.create({ userId, firstPrompt });
}

export async function findDesignForUser(
  designId: string,
  userId: string
): Promise<DesignDocument | null> {
  if (!mongoose.isValidObjectId(designId)) return null;
  return DesignModel.findOne({ _id: designId, userId });
}

export async function listDesignsByUser(userId: string) {
  return DesignModel.find({ userId }).sort({ _id: -1 }).lean();
}
