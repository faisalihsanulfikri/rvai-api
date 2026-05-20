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

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function detectMimeFromBuffer(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

export async function saveImage(
  imageBuffer: Buffer,
  options?: { mimeType?: string; filename?: string }
): Promise<string> {
  const mimeType = options?.mimeType ?? detectMimeFromBuffer(imageBuffer);
  const ext = MIME_TO_EXT[mimeType] ?? 'jpg';
  const uniqueFilename = options?.filename || `${uuidv4()}.${ext}`;
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
  const realMime = detectMimeFromBuffer(decoded.buffer);
  const ext = MIME_TO_EXT[realMime] ?? 'jpg';
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(IMAGE_STORAGE_PATH, filename);
  await fs.writeFile(filepath, decoded.buffer);
  return filename;
}

