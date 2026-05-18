import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export async function enhancePrompt(prompt: string): Promise<string> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const response = await model.generateContent(
      `You are an expert interior design AI assistant. Enhance this prompt for maximum visual clarity:\n"${prompt}"\n\nRespond with ONLY the enhanced prompt.`
    );

    return response.response.text().trim() || prompt;
  } catch (error) {
    console.warn('Failed to enhance prompt:', error);
    return prompt;
  }
}

export async function generateImageBuffer(prompt: string): Promise<Buffer> {
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to generate image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}
