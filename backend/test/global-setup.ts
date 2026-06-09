import mysql from 'mysql2/promise';
import { applyMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';

const TEST_DB = 'nundinae_test';
const host = process.env.DB_HOST ?? '127.0.0.1';
const port = Number(process.env.DB_PORT ?? 3307);
const user = process.env.DB_USER ?? 'nundinae';
const password = process.env.DB_PASSWORD ?? 'nundinae_dev';
const rootPassword = process.env.DB_ROOT_PASSWORD ?? 'nundinae_root';

/**
 * Setup global dos testes: cria um banco isolado `nundinae_test`, concede
 * acesso ao usuário da aplicação, aplica o schema + regras de negócio e popula
 * dados de exemplo. Roda uma única vez antes de toda a suíte.
 */
export default async function setup(): Promise<void> {
  const root = await mysql.createConnection({
    host, port, user: 'root', password: rootPassword, multipleStatements: true,
  });
  try {
    await root.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await root.query(`GRANT ALL PRIVILEGES ON \`${TEST_DB}\`.* TO '${user}'@'%'`);
    await root.query('FLUSH PRIVILEGES');
    // Necessário para criar triggers/procedures sem privilégio SUPER.
    await root.query('SET GLOBAL log_bin_trust_function_creators = 1');
  } finally {
    await root.end();
  }

  const conn = await mysql.createConnection({
    host, port, user, password, database: TEST_DB, multipleStatements: true,
  });
  try {
    await applyMigrations(conn);
    await seedDatabase(conn);
  } finally {
    await conn.end();
  }
}
