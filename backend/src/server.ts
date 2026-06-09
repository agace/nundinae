import { app } from './app.js';
import { env } from './config/env.js';
import { ping } from './db/pool.js';

async function start() {
  try {
    await ping();
    console.log('[ok] MySQL conectado');
  } catch (err) {
    console.warn('[warn] Não foi possível conectar no MySQL:', (err as Error).message);
    console.warn('       O servidor vai subir, mas endpoints que usam DB vão falhar.');
  }

  app.listen(env.port, () => {
    console.log(`\nNundinae API rodando em http://localhost:${env.port}`);
    console.log(`  CORS origin: ${env.corsOrigin}`);
    console.log(`  Env: ${env.nodeEnv}\n`);
  });
}

start();
