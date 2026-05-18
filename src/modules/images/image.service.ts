import fs from 'fs/promises';
import path from 'path';

const IMAGE_STORAGE_PATH = process.env.IMAGE_STORAGE_PATH || './uploads/images';

export async function getImageBuffer(filename: string): Promise<Buffer> {
  const filepath = path.join(IMAGE_STORAGE_PATH, filename);
  return fs.readFile(filepath);
}
