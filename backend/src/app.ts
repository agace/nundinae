import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/error.js';

/** Cria a aplicação Express. Separado de server.ts para permitir testes
 *  de integração (supertest) sem subir o listener HTTP. */
export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
