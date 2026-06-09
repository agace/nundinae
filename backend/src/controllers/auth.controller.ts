import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { USER_PUBLIC_COLUMNS, mapUser } from './users.controller.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const registerSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  senha: z.string().min(6).max(100),
  tipo: z.enum(['comprador', 'vendedor', 'ambos']).optional().default('ambos'),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

interface UserRow extends RowDataPacket {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  tipo: 'comprador' | 'vendedor' | 'ambos' | 'admin';
  reputacao: number;
  total_avaliacoes: number;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);

    const [existing] = await pool.query<UserRow[]>(
      'SELECT id FROM usuarios WHERE email = ?',
      [data.email],
    );
    if (existing.length > 0) throw new HttpError(409, 'E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(data.senha, 10);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (?, ?, ?, ?)',
      [data.nome, data.email, senhaHash, data.tipo],
    );

    const userId = result.insertId;
    await pool.query('INSERT INTO carrinhos (usuario_id) VALUES (?)', [userId]);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${USER_PUBLIC_COLUMNS} FROM usuarios WHERE id = ?`,
      [userId],
    );
    const token = signToken({ sub: userId, email: data.email, tipo: data.tipo });
    res.status(201).json({ token, user: mapUser(rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM usuarios WHERE email = ?',
      [data.email],
    );
    const user = rows[0];
    if (!user) throw new HttpError(401, 'Credenciais inválidas');

    const ok = await bcrypt.compare(data.senha, user.senha_hash);
    if (!ok) throw new HttpError(401, 'Credenciais inválidas');

    if (!user.ativo) throw new HttpError(403, 'Conta bloqueada. Procure o administrador.');

    const token = signToken({ sub: user.id, email: user.email, tipo: user.tipo });
    res.json({ token, user: mapUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [rows] = await pool.query<UserRow[]>(
      `SELECT ${USER_PUBLIC_COLUMNS} FROM usuarios WHERE id = ?`,
      [userId],
    );
    const user = rows[0];
    if (!user) throw new HttpError(404, 'Usuário não encontrado');
    res.json(mapUser(user));
  } catch (err) {
    next(err);
  }
}
