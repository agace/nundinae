import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { connectionOptions } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function hasSql(chunk: string): boolean {
  return chunk.split('\n').some((line) => {
    const t = line.trim();
    return t.length > 0 && !t.startsWith('--');
  });
}

async function ensureColumn(
  conn: mysql.Connection,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  if (rows.length === 0) {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[migrate] Coluna ${table}.${column} adicionada.`);
  }
}

export async function applyMigrations(conn: mysql.Connection): Promise<number> {
  const schema = await readFile(resolve(__dirname, 'schema.sql'), 'utf-8');
  const procedures = await readFile(resolve(__dirname, 'procedures.sql'), 'utf-8');

  await conn.query(schema);

  // CREATE TABLE IF NOT EXISTS não altera tabelas existentes: os ensureColumn
  // abaixo atualizam bancos criados antes destas colunas.
  await ensureColumn(conn, 'usuarios', 'ativo', 'TINYINT(1) NOT NULL DEFAULT 1');

  // Perfil do usuário + endereço reutilizável.
  await ensureColumn(conn, 'usuarios', 'avatar_url', 'TEXT');
  await ensureColumn(conn, 'usuarios', 'telefone', 'VARCHAR(20)');
  await ensureColumn(conn, 'usuarios', 'bio', 'VARCHAR(280)');
  await ensureColumn(conn, 'usuarios', 'endereco_cep', 'VARCHAR(9)');
  await ensureColumn(conn, 'usuarios', 'endereco_logradouro', 'VARCHAR(150)');
  await ensureColumn(conn, 'usuarios', 'endereco_numero', 'VARCHAR(20)');
  await ensureColumn(conn, 'usuarios', 'endereco_complemento', 'VARCHAR(100)');
  await ensureColumn(conn, 'usuarios', 'endereco_bairro', 'VARCHAR(100)');
  await ensureColumn(conn, 'usuarios', 'endereco_cidade', 'VARCHAR(100)');
  await ensureColumn(conn, 'usuarios', 'endereco_estado', 'VARCHAR(2)');

  // imagem do produto passa a aceitar upload (URL longa do Cloudinary ou base64 do fallback).
  await conn.query('ALTER TABLE produtos MODIFY COLUMN imagem MEDIUMTEXT');

  // Snapshot do endereço de entrega no pedido.
  await ensureColumn(conn, 'pedidos', 'entrega_cep', 'VARCHAR(9)');
  await ensureColumn(conn, 'pedidos', 'entrega_logradouro', 'VARCHAR(150)');
  await ensureColumn(conn, 'pedidos', 'entrega_numero', 'VARCHAR(20)');
  await ensureColumn(conn, 'pedidos', 'entrega_complemento', 'VARCHAR(100)');
  await ensureColumn(conn, 'pedidos', 'entrega_bairro', 'VARCHAR(100)');
  await ensureColumn(conn, 'pedidos', 'entrega_cidade', 'VARCHAR(100)');
  await ensureColumn(conn, 'pedidos', 'entrega_estado', 'VARCHAR(2)');

  // Cupom de desconto aplicado ao pedido (snapshot do código + valor abatido).
  await ensureColumn(conn, 'pedidos', 'cupom_codigo', 'VARCHAR(40)');
  await ensureColumn(conn, 'pedidos', 'desconto', 'DECIMAL(10,2) NOT NULL DEFAULT 0');

  // Dono do cupom: cada vendedor gerencia os seus. NULL = cupom global (legado).
  await ensureColumn(conn, 'cupons', 'vendedor_id', 'INT NULL');

  // Rastreamento: amplia os status do pedido (preparando/enviado) para a
  // timeline estilo Mercado Livre. Idempotente — re-aplicar mantém o mesmo enum.
  await conn.query(
    `ALTER TABLE pedidos MODIFY COLUMN status
       ENUM('pendente','pago','preparando','enviado','entregue','cancelado')
       NOT NULL DEFAULT 'pendente'`,
  );

  // Triggers/procedures contêm ";" internos; executamos cada statement
  // separadamente (split por "-- @SPLIT@") para não depender de DELIMITER.
  const statements = procedures
    .split('-- @SPLIT@')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && hasSql(s));

  for (const stmt of statements) {
    await conn.query(stmt);
  }
  return statements.length;
}

async function run() {
  const conn = await mysql.createConnection({
    ...connectionOptions,
    multipleStatements: true,
  });
  try {
    console.log('[migrate] Aplicando schema + regras de negócio...');
    const n = await applyMigrations(conn);
    console.log(`[migrate] OK — schema + ${n} regras de negócio aplicadas.`);
  } finally {
    await conn.end();
  }
}

// Executa apenas quando rodado diretamente (npm run migrate), não ao importar.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((err) => {
    console.error('[migrate] Erro:', err);
    process.exit(1);
  });
}
