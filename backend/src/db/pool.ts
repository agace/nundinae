import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

// Reusado pelo pool da API e pelas conexões avulsas da CLI (migrate e seed),
// para que todas falem TLS com o mesmo certificado.
export const connectionOptions: mysql.ConnectionOptions = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  ...(env.db.ssl
    ? { ssl: { rejectUnauthorized: true, ...(env.db.sslCa ? { ca: env.db.sslCa } : {}) } }
    : {}),
};

export const pool = mysql.createPool({
  ...connectionOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: false,
  // O banco grava os DATETIME em UTC (CURRENT_TIMESTAMP). Sem isto o mysql2 os
  // leria como horário local e empurraria a data para frente. 'Z' = ler como UTC.
  timezone: 'Z',
});

export async function ping(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
