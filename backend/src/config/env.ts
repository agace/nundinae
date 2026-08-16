import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Carrega backend/.env de forma independente do cwd (dev pela raiz, testes, CLI).
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const DEV_DEFAULTS = {
  DB_HOST: '127.0.0.1',
  DB_USER: 'nundinae',
  DB_PASSWORD: 'nundinae_dev',
  DB_NAME: 'nundinae',
  JWT_SECRET: 'dev-only-nundinae-secret',
  CORS_ORIGIN: 'http://localhost:5173',
  FRONTEND_URL: 'http://localhost:5173',
} as const;

const problems: string[] = [];

function read(name: keyof typeof DEV_DEFAULTS): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isProduction) {
    problems.push(`${name} não definida`);
    return '';
  }
  return DEV_DEFAULTS[name];
}

// Integrações opcionais. O trim é o que importa: painéis de deploy costumam não
// aceitar campo vazio, e um único espaço em branco faria o isConfigured() da
// integração retornar true, ligando por acidente o pagamento ou o e-mail real.
function opcional(nome: string): string {
  return process.env[nome]?.trim() ?? '';
}

// Aceita o PEM direto ou em base64: nem todo painel de deploy preserva as
// quebras de linha do certificado.
function lerCertificado(valor: string | undefined): string | undefined {
  const bruto = valor?.trim();
  if (!bruto) return undefined;
  if (bruto.includes('BEGIN CERTIFICATE')) return bruto.replace(/\\n/g, '\n');
  return Buffer.from(bruto, 'base64').toString('utf-8');
}

const jwtSecret = read('JWT_SECRET');
if (isProduction && jwtSecret) {
  if (jwtSecret.length < 32) {
    problems.push('JWT_SECRET precisa ter ao menos 32 caracteres');
  }
  if (jwtSecret === DEV_DEFAULTS.JWT_SECRET || jwtSecret.includes('change-me')) {
    problems.push('JWT_SECRET ainda é o valor de exemplo');
  }
}

const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv,
  isProduction,
  db: {
    host: read('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3307),
    user: read('DB_USER'),
    password: read('DB_PASSWORD'),
    database: read('DB_NAME'),
    // Bancos gerenciados (Aiven, RDS) exigem TLS.
    ssl: process.env.DB_SSL === 'true',
    // Provedores que assinam com CA própria (o Aiven é um deles) precisam do
    // ca.pem, senão a validação do certificado falha na conexão.
    sslCa: lerCertificado(process.env.DB_SSL_CA),
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigins: read('CORS_ORIGIN').split(',').map((o) => o.trim()).filter(Boolean),
  frontendUrl: read('FRONTEND_URL'),
  mercadoPago: {
    accessToken: opcional('MP_ACCESS_TOKEN'),
  },
  email: {
    apiKey: opcional('RESEND_API_KEY'),
    from: opcional('RESEND_FROM') || 'Nundinae <onboarding@resend.dev>',
  },
  cloudinary: {
    cloudName: opcional('CLOUDINARY_CLOUD_NAME'),
    apiKey: opcional('CLOUDINARY_API_KEY'),
    apiSecret: opcional('CLOUDINARY_API_SECRET'),
  },
};

// Falha na subida em vez de rodar produção com segredo de desenvolvimento.
if (problems.length > 0) {
  throw new Error(
    `Configuração inválida para NODE_ENV=production:\n  - ${problems.join('\n  - ')}\n` +
    'Defina as variáveis no ambiente de deploy (ver backend/.env.example).',
  );
}

export { env };
