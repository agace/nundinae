import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: false,
  // O banco grava os DATETIME em UTC (CURRENT_TIMESTAMP). Sem isto o mysql2 os
  // leria como horário local e empurraria a data para frente. 'Z' = ler como UTC.
  timezone: 'Z',
  ...(env.db.ssl
    ? { ssl: { rejectUnauthorized: true, ...(env.db.sslCa ? { ca: env.db.sslCa } : {}) } }
    : {}),
});

export async function ping(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
