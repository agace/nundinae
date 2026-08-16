import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import { parseId } from '../utils/params.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, tipo, titulo, mensagem, link, lida, created_at
         FROM notificacoes WHERE usuario_id = ?
        ORDER BY created_at DESC LIMIT 30`,
      [userId],
    );
    const naoLidas = rows.filter((r) => !r.lida).length;
    res.json({
      nao_lidas: naoLidas,
      items: rows.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        titulo: r.titulo,
        mensagem: r.mensagem,
        link: r.link,
        lida: Boolean(r.lida),
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const id = parseId(req.params.id, 'Notificação');
    await pool.query('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?', [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0',
      [userId],
    );
    res.json({ ok: true, atualizadas: result.affectedRows });
  } catch (err) {
    next(err);
  }
}
