import { app } from './app.js';
import { env } from './config/env.js';
import { pool, ping } from './db/pool.js';

async function start(): Promise<void> {
  try {
    await ping();
    console.log('[ok] MySQL conectado');
  } catch (err) {
    const motivo = (err as Error).message;
    // Em produção um processo sem banco não serve pra nada e mascararia a falha
    // como "aplicação saudável" para o health check da hospedagem.
    if (env.isProduction) {
      console.error('[erro] Sem conexão com o MySQL:', motivo);
      process.exit(1);
    }
    console.warn('[aviso] Não foi possível conectar no MySQL:', motivo);
    console.warn('        O servidor sobe, mas endpoints que usam o banco vão falhar.');
  }

  const server = app.listen(env.port, () => {
    console.log(`\nNundinae API na porta ${env.port} (${env.nodeEnv})\n`);
  });

  for (const sinal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(sinal, () => {
      server.close(() => {
        pool.end().finally(() => process.exit(0));
      });
    });
  }
}

start();
