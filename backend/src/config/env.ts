import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Carrega backend/.env de forma independente do cwd (dev pela raiz, testes, CLI).
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: required('DB_HOST', '127.0.0.1'),
    port: Number(process.env.DB_PORT ?? 3307),
    user: required('DB_USER', 'nundinae'),
    password: required('DB_PASSWORD', 'nundinae_dev'),
    database: required('DB_NAME', 'nundinae'),
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev-only-nundinae-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // URL pública do frontend, usada nos back_urls do Mercado Pago.
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  mercadoPago: {
    // Access Token de teste (sandbox). Se vazio, o checkout usa o modo simulado.
    accessToken: process.env.MP_ACCESS_TOKEN ?? '',
  },
  email: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Nundinae <no-reply@nundinae.com>',
  },
  cloudinary: {
    // Armazenamento de imagens (doc). Sem as 3 chaves, o upload cai no
    // fallback base64 — assim a aplicação roda sem credenciais.
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
};
