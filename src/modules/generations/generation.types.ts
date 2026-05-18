import { Generation } from '../../shared/types/index.js';

export interface CreateGenerationRequest {
  prompt: string;
  designId?: string;
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
}

export interface RegenerateRequest {
  prompt: string;
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
}

export interface GenerationResponse extends Generation {}
