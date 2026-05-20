import { GoogleGenAI, Modality } from '@google/genai';
import { createHash } from 'crypto';
import { AspectRatio, DesignStyle, Room } from '../../shared/types/index.js';

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface InputImage {
  mimeType: string;
  data: string;
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: AspectRatio;
  style?: DesignStyle;
  room?: Room;
  inputImage?: InputImage;
}

export interface GenerateImageResult {
  buffer: Buffer;
  finalPrompt: string;
  mimeType: string;
}

const ROOM_LABELS: Record<Room, string> = {
  'living-room': 'Living Room',
  'bedroom': 'Bedroom',
  'kitchen': 'Kitchen',
  'bathroom': 'Bathroom',
  'home-office': 'Home Office',
  'dining-room': 'Dining Room',
};

function buildFinalPrompt(opts: {
  prompt: string;
  style?: DesignStyle;
  room?: Room;
  hasInputImage: boolean;
}): string {
  const parts: string[] = [];
  if (opts.hasInputImage) {
    parts.push(
      'Edit the attached interior reference image. Preserve room geometry, camera angle, and the overall layout. ' +
      'Apply the following change:'
    );
  }
  parts.push(opts.prompt);
  if (opts.room) {
    parts.push(`Room: ${ROOM_LABELS[opts.room]}`);
  }
  if (opts.style) {
    parts.push(`Style: ${opts.style}`);
  }
  return parts.join('\n\n');
}

function computeSeed(finalPrompt: string, aspectRatio: AspectRatio): number {
  const hash = createHash('sha256').update(`${aspectRatio}|${finalPrompt}`).digest();
  return hash.readInt32BE(0);
}

export async function generateImageBuffer(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const { prompt, style, room, inputImage, aspectRatio } = options;

  const ratio = aspectRatio ?? '1:1';
  const finalPrompt = buildFinalPrompt({ prompt, style, room, hasInputImage: !!inputImage });
  const seed = computeSeed(finalPrompt, ratio);

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (inputImage) {
    parts.push({ inlineData: { mimeType: inputImage.mimeType, data: inputImage.data } });
  }
  parts.push({ text: finalPrompt });

  const config: {
    responseModalities: Modality[];
    seed?: number;
    imageConfig?: { aspectRatio: AspectRatio };
  } = {
    responseModalities: [Modality.IMAGE, Modality.TEXT],
  };
  if (inputImage) {
    const inputBase64Bytes = inputImage.data.length;
    const inputRawBytes = Math.floor((inputBase64Bytes * 3) / 4);
    console.log(
      `Gemini input image: mimeType=${inputImage.mimeType}, base64 size=${inputBase64Bytes} chars (~${(inputRawBytes / 1024 / 1024).toFixed(2)} MB raw)`
    );
  } else {
    config.seed = seed;
    config.imageConfig = { aspectRatio: ratio };
  }

  const ai = getClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts }],
      config,
    });
  } catch (err) {
    const detail = (err as any)?.response?.data ?? (err as any)?.cause ?? (err as any)?.message;
    console.error('Gemini generateContent failed:', JSON.stringify(detail, null, 2));
    throw err;
  }

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p?.inlineData?.data
  );
  const data = imagePart?.inlineData?.data;
  if (!data) {
    const blockReason = response.promptFeedback?.blockReason;
    throw new Error(
      `Gemini image generation returned no image${blockReason ? ` (blocked: ${blockReason})` : ''}`
    );
  }

  const mimeType = imagePart?.inlineData?.mimeType ?? 'image/png';
  return { buffer: Buffer.from(data, 'base64'), finalPrompt, mimeType };
}
