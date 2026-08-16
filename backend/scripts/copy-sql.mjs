import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// migrate.ts lê schema.sql/procedures.sql relativos ao próprio diretório, e o
// tsc só emite .js. Sem esta cópia, a migração falha no build de produção.
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'src', 'db');
const destino = join(raiz, 'dist', 'db');

await mkdir(destino, { recursive: true });

const arquivos = (await readdir(origem)).filter((f) => f.endsWith('.sql'));
for (const arquivo of arquivos) {
  await copyFile(join(origem, arquivo), join(destino, arquivo));
}

console.log(`[build] ${arquivos.length} arquivos .sql copiados para dist/db`);
