import mongoose, { Schema, Document } from 'mongoose';
import { Generation, GenerationStatus, DesignStyle, AspectRatio } from '../../shared/types/index.js';

export interface GenerationDocument extends Generation, Document {}

const generationSchema = new Schema<GenerationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    designId: {
      type: String,
      required: true,
      index: true,
    },
    originalPrompt: {
      type: String,
      required: true,
    },
    finalPrompt: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imageFilename: String,
    inputImageFilename: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'] as GenerationStatus[],
      default: 'pending',
      index: true,
    },
    errorMessage: String,
    style: {
      type: String,
      enum: ['minimalist', 'modern', 'industrial', 'japandi'],
    },
    aspectRatio: {
      type: String,
      enum: ['1:1', '16:9', '9:16', '4:3'],
    },
  },
  {
    timestamps: true,
  }
);

generationSchema.index({ userId: 1, createdAt: -1 });

export const GenerationModel = mongoose.model<GenerationDocument>(
  'Generation',
  generationSchema
);
