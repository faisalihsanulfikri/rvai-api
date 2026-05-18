import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/index.js';
import { generationRouter } from './modules/generations/index.js';
import { imageRouter } from './modules/images/index.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Module routes
  app.use('/api/auth', authRouter);
  app.use('/api/generations', generationRouter);
  app.use('/api/images', imageRouter);

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}
