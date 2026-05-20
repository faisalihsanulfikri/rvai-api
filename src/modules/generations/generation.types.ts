import { Generation, Room } from '../../shared/types/index.js';

export interface CreateGenerationRequest {
  prompt: string;
  designId?: string;
  style?: 'minimalist' | 'modern' | 'industrial' | 'japandi';
  room?: Room;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  inputImage?: string;
}

export interface GenerationResponse extends Generation {}
