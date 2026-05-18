export type GenerationStatus = 'pending' | 'processing' | 'success' | 'failed';
export type DesignStyle = 'minimalist' | 'modern' | 'industrial' | 'japandi';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';

export interface User {
  _id?: any;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Generation {
  _id?: any;
  userId: string;
  originalPrompt: string;
  finalPrompt: string;
  imageUrl: string;
  imageFilename?: string;
  status: GenerationStatus;
  errorMessage?: string;
  style?: DesignStyle;
  aspectRatio?: AspectRatio;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface GenerationJob {
  generationId: string;
  userId: string;
  originalPrompt: string;
  style?: DesignStyle;
  aspectRatio?: AspectRatio;
}
