import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';

const reviewSchema = z.object({
  pedido_id: z.number().int().positive(),
  vendedor_id: z.number().int().positive(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional().default(''),
});

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = reviewSchema.parse(req.body);
    const avaliadorId = req.user!.sub;

    // As regras RN005 (só avalia pedido pago, dono do pedido, vendedor
    // participante) e RN006 (nota 1-5) são garantidas por trigger/constraint no
    // banco. RF07 (reputação = média) é recalculada por trigger após o INSERT.
    await pool.query(
      `INSERT INTO avaliacoes (pedido_id, avaliador_id, avaliado_id, nota, comentario)
       VALUES (?, ?, ?, ?, ?)`,
      [data.pedido_id, avaliadorId, data.vendedor_id, data.nota, data.comentario],
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT reputacao, total_avaliacoes FROM usuarios WHERE id = ?',
      [data.vendedor_id],
    );

    res.status(201).json({
      ok: true,
      reputacao: Number(rows[0]?.reputacao ?? 0),
      total_avaliacoes: Number(rows[0]?.total_avaliacoes ?? 0),
    });
  } catch (err) {
    next(err);
  }
}

export async function listBySeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendedorId = Number(req.params.vendedorId);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.nota, a.comentario, a.created_at,
              u.nome AS avaliador_nome
         FROM avaliacoes a
         JOIN usuarios u ON u.id = a.avaliador_id
        WHERE a.avaliado_id = ?
        ORDER BY a.created_at DESC
        LIMIT 50`,
      [vendedorId],
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        nota: r.nota,
        comentario: r.comentario,
        created_at: r.created_at,
        avaliador_nome: r.avaliador_nome,
      })),
    );
  } catch (err) {
    next(err);
  }
}
