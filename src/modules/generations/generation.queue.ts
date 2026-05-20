import { Queue, Worker } from 'bullmq';
import { GenerationJob } from '../../shared/types/index.js';
import { updateGenerationStatus } from './generation.service.js';
import { generateImageBuffer, InputImage } from './ai.service.js';
import {
  saveImage,
  getImageUrl,
  getImageBuffer,
  detectMimeFromBuffer,
} from './image-storage.service.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export async function createQueue() {
  return new Queue<GenerationJob>('image-generation', { connection: { url: redisUrl } });
}

export async function startWorker() {
  const worker = new Worker<GenerationJob>(
    'image-generation',
    async (job) => {
      const { generationId, originalPrompt, style, room, aspectRatio, inputImageFilename } = job.data;

      try {
        await updateGenerationStatus(generationId, { status: 'processing' });

        let inputImage: InputImage | undefined;
        if (inputImageFilename) {
          const buffer = await getImageBuffer(inputImageFilename);
          inputImage = {
            mimeType: detectMimeFromBuffer(buffer),
            data: buffer.toString('base64'),
          };
        }

        const { buffer: imageBuffer, finalPrompt, mimeType } = await generateImageBuffer({
          prompt: originalPrompt,
          style,
          room,
          aspectRatio,
          inputImage,
        });
        const filename = await saveImage(imageBuffer, { mimeType });
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
        const attempt = job.attemptsMade + 1;
        const maxAttempts = job.opts.attempts ?? 1;
        const isFinalAttempt = attempt >= maxAttempts;

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        if (isFinalAttempt) {
          console.error(`✗ Generation ${generationId} failed after ${attempt} attempts:`, error);
          await updateGenerationStatus(generationId, {
            status: 'failed',
            errorMessage,
          });
        } else {
          console.warn(
            `↻ Generation ${generationId} attempt ${attempt}/${maxAttempts} failed, retrying:`,
            errorMessage
          );
        }

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
