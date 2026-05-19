import { GoogleGenAI } from '@google/genai';
import { createHash } from 'crypto';
import { AspectRatio, DesignStyle } from '../../shared/types/index.js';

const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
};

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
  inputImage?: InputImage;
}

export interface GenerateImageResult {
  buffer: Buffer;
  finalPrompt: string;
}

async function describeInputImage(image: InputImage): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    config: {
      temperature: 0,
      topP: 0,
    },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.data } },
          {
            text:
              'You are an expert interior-design analyst. Describe only what is clearly visible in the image. ' +
              'If a field is not clearly visible, write "unknown" for that field. Do not invent or assume details that are not present.\n\n' +
              'Output exactly this format. One line per field, no extra text, no preamble, no commentary:\n' +
              'Room: <type>\n' +
              'Layout: <short phrase>\n' +
              'Walls: <color and material>\n' +
              'Floor: <material and color>\n' +
              'Lighting: <natural/artificial, warm/cool>\n' +
              'Furniture: <3-5 key pieces>\n' +
              'Palette: <3-4 dominant colors>\n' +
              'Mood: <one adjective phrase>',
          },
        ],
      },
    ],
  });

  const text =
    response.text ??
    response.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === 'string')?.text;

  if (!text || !text.trim()) {
    throw new Error('Gemini vision returned no description');
  }
  return text.trim();
}

function buildFinalPrompt(opts: {
  prompt: string;
  style?: DesignStyle;
  description?: string;
}): string {
  const parts: string[] = [];
  if (opts.description) {
    parts.push(`Reference scene: ${opts.description}`);
    parts.push(`Transform to: ${opts.prompt}`);
  } else {
    parts.push(opts.prompt);
  }
  if (opts.style) {
    parts.push(`Style: ${opts.style}`);
  }
  return parts.join('\n\n');
}

function computeSeed(finalPrompt: string, aspectRatio: AspectRatio): number {
  const hash = createHash('sha256').update(`${aspectRatio}|${finalPrompt}`).digest();
  return hash.readUInt32BE(0);
}

export async function generateImageBuffer(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const { prompt, style, inputImage, aspectRatio } = options;

  const description = inputImage ? await describeInputImage(inputImage) : undefined;
  const finalPrompt = buildFinalPrompt({ prompt, style, description });

  const ratio = aspectRatio ?? '1:1';
  const dims = ASPECT_RATIO_DIMENSIONS[ratio];
  const seed = computeSeed(finalPrompt, ratio);
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(finalPrompt)}?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), finalPrompt };
}
