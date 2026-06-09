import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';

/** Lista de desejos do usuário logado (produtos ativos favoritados). */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, u.nome AS vendedor_nome, u.reputacao AS vendedor_reputacao, f.created_at AS favoritado_em
         FROM favoritos f
         JOIN produtos p ON p.id = f.produto_id
         JOIN usuarios u ON u.id = p.vendedor_id
        WHERE f.usuario_id = ? AND p.ativo = 1
        ORDER BY f.created_at DESC`,
      [userId],
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        vendedor_id: row.vendedor_id,
        vendedor_nome: row.vendedor_nome,
        vendedor_reputacao: Number(row.vendedor_reputacao),
        nome: row.nome,
        descricao: row.descricao,
        preco: Number(row.preco),
        imagem: row.imagem,
        estoque: row.estoque,
        categoria: row.categoria,
        ativo: Boolean(row.ativo),
        created_at: row.created_at,
      })),
    );
  } catch (err) {
    next(err);
  }
}

/** Apenas os IDs favoritados — usado pelo frontend para marcar os corações. */
export async function listIds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT produto_id FROM favoritos WHERE usuario_id = ?',
      [userId],
    );
    res.json(rows.map((r) => r.produto_id as number));
  } catch (err) {
    next(err);
  }
}

/** Favorita um produto (idempotente — ignora se já estava na lista). */
export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const produtoId = Number(req.params.produtoId);
    await pool.query(
      'INSERT IGNORE INTO favoritos (usuario_id, produto_id) VALUES (?, ?)',
      [userId, produtoId],
    );
    res.status(201).json({ ok: true, produto_id: produtoId, favorito: true });
  } catch (err) {
    next(err);
  }
}

/** Remove um produto da lista de desejos. */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const produtoId = Number(req.params.produtoId);
    await pool.query('DELETE FROM favoritos WHERE usuario_id = ? AND produto_id = ?', [userId, produtoId]);
    res.json({ ok: true, produto_id: produtoId, favorito: false });
  } catch (err) {
    next(err);
  }
}
