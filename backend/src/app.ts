import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/error.js';

// Separado de server.ts para permitir testes de integração (supertest) sem
// subir o listener HTTP.
export function createApp() {
  const app = express();

  // Atrás do proxy da hospedagem, para que req.ip seja o IP real do cliente
  // (o rate limit depende disso) e não o do balanceador.
  if (env.isProduction) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', router);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use(errorHandler);
  return app;
}

export const app = createApp();
