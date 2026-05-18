import mongoose, { Schema, Document } from 'mongoose';
import { Design } from '../../shared/types/index.js';

export interface DesignDocument extends Design, Document {}

const designSchema = new Schema<DesignDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    firstPrompt: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

designSchema.index({ userId: 1, createdAt: -1 });

export const DesignModel = mongoose.model<DesignDocument>('Design', designSchema);
