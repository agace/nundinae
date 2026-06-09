import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import type { RowDataPacket } from 'mysql2';

/** RF09 — Gerenciamento de usuários pelo administrador. */

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.reputacao, u.total_avaliacoes, u.created_at,
              (SELECT COUNT(*) FROM produtos p WHERE p.vendedor_id = u.id AND p.ativo = 1) AS total_produtos,
              (SELECT COUNT(*) FROM pedidos pd WHERE pd.usuario_id = u.id) AS total_pedidos
         FROM usuarios u
        ORDER BY u.created_at DESC`,
    );
    res.json(
      rows.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        tipo: u.tipo,
        ativo: Boolean(u.ativo),
        reputacao: Number(u.reputacao),
        total_avaliacoes: u.total_avaliacoes,
        total_produtos: Number(u.total_produtos),
        total_pedidos: Number(u.total_pedidos),
        created_at: u.created_at,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [[u]] = await pool.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM usuarios) AS usuarios,
         (SELECT COUNT(*) FROM usuarios WHERE ativo = 0) AS usuarios_bloqueados,
         (SELECT COUNT(*) FROM produtos WHERE ativo = 1) AS produtos,
         (SELECT COUNT(*) FROM produtos WHERE ativo = 0) AS produtos_inativos,
         (SELECT COUNT(*) FROM pedidos WHERE status = 'pago') AS pedidos_pagos,
         (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE status = 'pago') AS faturamento`,
    );
    res.json({
      usuarios: Number(u.usuarios),
      usuarios_bloqueados: Number(u.usuarios_bloqueados),
      produtos: Number(u.produtos),
      produtos_inativos: Number(u.produtos_inativos),
      pedidos_pagos: Number(u.pedidos_pagos),
      faturamento: Number(u.faturamento),
    });
  } catch (err) {
    next(err);
  }
}

/** RF09 — Listagem de TODOS os produtos (inclusive inativos) para o admin. */
export async function listProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.nome, p.preco, p.estoque, p.categoria, p.imagem, p.ativo,
              p.vendedor_id, u.nome AS vendedor_nome, p.created_at
         FROM produtos p
         JOIN usuarios u ON u.id = p.vendedor_id
        ORDER BY p.created_at DESC`,
    );
    res.json(
      rows.map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        estoque: p.estoque,
        categoria: p.categoria,
        imagem: p.imagem,
        ativo: Boolean(p.ativo),
        vendedor_id: p.vendedor_id,
        vendedor_nome: p.vendedor_nome,
        created_at: p.created_at,
      })),
    );
  } catch (err) {
    next(err);
  }
}

const statusSchema = z.object({ ativo: z.boolean() });

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { ativo } = statusSchema.parse(req.body);

    if (id === req.user!.sub) {
      throw new HttpError(400, 'Você não pode bloquear a própria conta');
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT tipo FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) throw new HttpError(404, 'Usuário não encontrado');
    if (rows[0].tipo === 'admin') throw new HttpError(400, 'Não é possível bloquear um administrador');

    await pool.query('UPDATE usuarios SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
    res.json({ ok: true, id, ativo });
  } catch (err) {
    next(err);
  }
}

const tipoSchema = z.object({ tipo: z.enum(['comprador', 'vendedor', 'ambos', 'admin']) });

export async function setTipo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { tipo } = tipoSchema.parse(req.body);

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) throw new HttpError(404, 'Usuário não encontrado');

    await pool.query('UPDATE usuarios SET tipo = ? WHERE id = ?', [tipo, id]);
    res.json({ ok: true, id, tipo });
  } catch (err) {
    next(err);
  }
}

export async function removeUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (id === req.user!.sub) {
      throw new HttpError(400, 'Você não pode excluir a própria conta');
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT tipo FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) throw new HttpError(404, 'Usuário não encontrado');
    if (rows[0].tipo === 'admin') throw new HttpError(400, 'Não é possível excluir um administrador');

    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
}
