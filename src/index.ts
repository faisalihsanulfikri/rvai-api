import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './shared/config/index.js';
import { initializeStorage, startWorker } from './modules/generations/index.js';

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    console.log('Starting RoomVision AI Backend...\n');

    // Initialize database
    await connectDatabase();

    // Initialize storage
    await initializeStorage();

    // Start job queue worker
    await startWorker();

    // Create and start Express app
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API endpoints ready`);
      console.log(`✓ Queue processor active\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
