import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import * as uploadService from '../services/upload.service.js';
import type { RowDataPacket } from 'mysql2';

// Colunas públicas do usuário: nunca inclui senha_hash.
export const USER_PUBLIC_COLUMNS =
  `id, nome, email, tipo, reputacao, total_avaliacoes, avatar_url, telefone, bio,
   endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento,
   endereco_bairro, endereco_cidade, endereco_estado`;

export function mapUser(u: RowDataPacket) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    tipo: u.tipo,
    reputacao: Number(u.reputacao),
    total_avaliacoes: u.total_avaliacoes,
    avatar_url: u.avatar_url ?? null,
    telefone: u.telefone ?? null,
    bio: u.bio ?? null,
    endereco_cep: u.endereco_cep ?? null,
    endereco_logradouro: u.endereco_logradouro ?? null,
    endereco_numero: u.endereco_numero ?? null,
    endereco_complemento: u.endereco_complemento ?? null,
    endereco_bairro: u.endereco_bairro ?? null,
    endereco_cidade: u.endereco_cidade ?? null,
    endereco_estado: u.endereco_estado ?? null,
  };
}

async function fetchUser(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM usuarios WHERE id = ?`,
    [userId],
  );
  if (rows.length === 0) throw new HttpError(404, 'Usuário não encontrado');
  return mapUser(rows[0]);
}

// Texto opcional: string vazia limpa o campo (vira null).
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const profileSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  telefone: optionalText(20),
  bio: optionalText(280),
  endereco_cep: optionalText(9),
  endereco_logradouro: optionalText(150),
  endereco_numero: optionalText(20),
  endereco_complemento: optionalText(100),
  endereco_bairro: optionalText(100),
  endereco_cidade: optionalText(100),
  endereco_estado: optionalText(2),
});

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const data = profileSchema.parse(req.body);

    await pool.query(
      `UPDATE usuarios SET
         nome = ?, telefone = ?, bio = ?,
         endereco_cep = ?, endereco_logradouro = ?, endereco_numero = ?,
         endereco_complemento = ?, endereco_bairro = ?, endereco_cidade = ?, endereco_estado = ?
       WHERE id = ?`,
      [
        data.nome, data.telefone, data.bio,
        data.endereco_cep, data.endereco_logradouro, data.endereco_numero,
        data.endereco_complemento, data.endereco_bairro, data.endereco_cidade, data.endereco_estado,
        userId,
      ],
    );

    res.json(await fetchUser(userId));
  } catch (err) {
    next(err);
  }
}

const passwordSchema = z.object({
  senha_atual: z.string().min(1),
  nova_senha: z.string().min(6).max(100),
});

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { senha_atual, nova_senha } = passwordSchema.parse(req.body);

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT senha_hash FROM usuarios WHERE id = ?',
      [userId],
    );
    if (rows.length === 0) throw new HttpError(404, 'Usuário não encontrado');

    const ok = await bcrypt.compare(senha_atual, rows[0].senha_hash);
    if (!ok) throw new HttpError(400, 'Senha atual incorreta');

    const novaHash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [novaHash, userId]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new HttpError(400, 'Envie um arquivo de imagem (JPG, PNG, etc.)'));
  },
});

export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    if (!req.file) throw new HttpError(400, 'Nenhuma imagem enviada');

    const avatarUrl = await uploadService.uploadAvatar(req.file.buffer, userId, req.file.mimetype);
    await pool.query('UPDATE usuarios SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    next(err);
  }
}

export async function removeAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    await uploadService.removeAvatar(userId);
    await pool.query('UPDATE usuarios SET avatar_url = NULL WHERE id = ?', [userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
