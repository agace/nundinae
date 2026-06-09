import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    include: ['test/**/*.test.ts'],
    // Variáveis lidas pela aplicação (config/env.ts) ao subir nos testes.
    // MP/SMTP vazios garantem que os testes usem o checkout simulado, mesmo
    // que o .env tenha credenciais reais (dotenv não sobrescreve estas chaves).
    env: {
      NODE_ENV: 'test',
      DB_NAME: 'nundinae_test',
      JWT_SECRET: 'test-secret-nundinae',
      MP_ACCESS_TOKEN: '',
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    },
    // Testes de integração compartilham o banco — rodar sequencialmente.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20000,
    hookTimeout: 40000,
  },
});
