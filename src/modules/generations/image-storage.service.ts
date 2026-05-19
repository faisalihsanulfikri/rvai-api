import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_STORAGE_PATH = process.env.IMAGE_STORAGE_PATH || './uploads/images';

export async function initializeStorage() {
  try {
    await fs.mkdir(IMAGE_STORAGE_PATH, { recursive: true });
  } catch (error) {
    console.error('Failed to create image storage directory:', error);
  }
}

export async function saveImage(imageBuffer: Buffer, filename?: string): Promise<string> {
  const uniqueFilename = filename || `${uuidv4()}.jpg`;
  const filepath = path.join(IMAGE_STORAGE_PATH, uniqueFilename);

  await fs.writeFile(filepath, imageBuffer);
  return uniqueFilename;
}

export async function deleteImage(filename: string): Promise<void> {
  const filepath = path.join(IMAGE_STORAGE_PATH, filename);

  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.warn(`Failed to delete image ${filename}:`, error);
  }
}

export function getImageUrl(filename: string): string {
  const baseUrl = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:3001';
  return `${baseUrl}/api/images/${filename}`;
}

export async function getImageBuffer(filename: string): Promise<Buffer> {
  const filepath = path.join(IMAGE_STORAGE_PATH, filename);
  return fs.readFile(filepath);
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface DecodedDataUrl {
  mimeType: string;
  data: string;
  buffer: Buffer;
}

export function decodeImageDataUrl(dataUrl: string): DecodedDataUrl {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error('inputImage must be a base64 data URL (image/jpeg, image/png, or image/webp)');
  }
  const [, mimeType, data] = match;
  return { mimeType, data, buffer: Buffer.from(data, 'base64') };
}

export async function saveInputImage(dataUrl: string): Promise<string> {
  const decoded = decodeImageDataUrl(dataUrl);
  const ext = MIME_EXTENSIONS[decoded.mimeType] ?? 'jpg';
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(IMAGE_STORAGE_PATH, filename);
  await fs.writeFile(filepath, decoded.buffer);
  return filename;
}

export function getMimeTypeForFilename(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}
