import { Queue, Worker } from 'bullmq';
import { GenerationJob } from '../../shared/types/index.js';
import { updateGenerationStatus } from './generation.service.js';
import { enhancePrompt, generateImageBuffer } from './ai.service.js';
import { saveImage, getImageUrl } from './image-storage.service.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export async function createQueue() {
  return new Queue<GenerationJob>('image-generation', { connection: { url: redisUrl } });
}

export async function startWorker() {
  const worker = new Worker<GenerationJob>(
    'image-generation',
    async (job) => {
      const { generationId, originalPrompt } = job.data;

      try {
        await updateGenerationStatus(generationId, { status: 'processing' });

        const finalPrompt = await enhancePrompt(originalPrompt);
        const imageBuffer = await generateImageBuffer(finalPrompt);
        const filename = await saveImage(imageBuffer);
        const imageUrl = getImageUrl(filename);

        await updateGenerationStatus(generationId, {
          status: 'success',
          finalPrompt,
          imageUrl,
          imageFilename: filename,
        });

        console.log(`✓ Generation ${generationId} completed`);
        return { success: true, imageUrl };
      } catch (error) {
        console.error(`✗ Generation ${generationId} failed:`, error);

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        await updateGenerationStatus(generationId, {
          status: 'failed',
          errorMessage,
        });

        throw error;
      }
    },
    { connection: { url: redisUrl } }
  );

  worker.on('completed', (job) => {
    console.log(`✓ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`✗ Job ${job?.id} failed:`, err);
  });

  console.log('✓ Generation worker started');
  return worker;
}

export async function queueGeneration(job: GenerationJob) {
  const queue = await createQueue();
  const result = await queue.add('generate', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
  return result;
}
