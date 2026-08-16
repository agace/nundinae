import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { parseId } from '../utils/params.js';
import { notify } from '../services/notifications.service.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const perguntaSchema = z.object({ pergunta: z.string().min(3).max(500) });
const respostaSchema = z.object({ resposta: z.string().min(1).max(500) });

function formatQuestion(r: RowDataPacket) {
  return {
    id: r.id,
    produto_id: r.produto_id,
    autor_id: r.autor_id,
    autor_nome: r.autor_nome,
    pergunta: r.pergunta,
    resposta: r.resposta,
    respondida_em: r.respondida_em,
    created_at: r.created_at,
  };
}

export async function listByProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const produtoId = parseId(req.params.id, 'Produto');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.nome AS autor_nome
         FROM perguntas q JOIN usuarios u ON u.id = q.autor_id
        WHERE q.produto_id = ?
        ORDER BY q.created_at DESC`,
      [produtoId],
    );
    res.json(rows.map(formatQuestion));
  } catch (err) {
    next(err);
  }
}

export async function ask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const produtoId = parseId(req.params.id, 'Produto');
    const { pergunta } = perguntaSchema.parse(req.body);

    const [prod] = await pool.query<RowDataPacket[]>(
      'SELECT id, nome, vendedor_id FROM produtos WHERE id = ? AND ativo = 1',
      [produtoId],
    );
    if (prod.length === 0) throw new HttpError(404, 'Produto não encontrado');
    if (prod[0].vendedor_id === userId) {
      throw new HttpError(400, 'Você não pode perguntar no seu próprio produto');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO perguntas (produto_id, autor_id, pergunta) VALUES (?, ?, ?)',
      [produtoId, userId, pergunta],
    );

    await notify(prod[0].vendedor_id, {
      tipo: 'pergunta',
      titulo: 'Nova pergunta em um produto',
      mensagem: `"${pergunta.slice(0, 120)}" — em ${prod[0].nome}`,
      link: `/produto/${produtoId}`,
    });

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.nome AS autor_nome FROM perguntas q JOIN usuarios u ON u.id = q.autor_id WHERE q.id = ?`,
      [result.insertId],
    );
    res.status(201).json(formatQuestion(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function answer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const perguntaId = parseId(req.params.id, 'Pergunta');
    const { resposta } = respostaSchema.parse(req.body);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.id, q.autor_id, q.produto_id, p.vendedor_id, p.nome AS produto_nome
         FROM perguntas q JOIN produtos p ON p.id = q.produto_id WHERE q.id = ?`,
      [perguntaId],
    );
    if (rows.length === 0) throw new HttpError(404, 'Pergunta não encontrada');
    const q = rows[0];
    if (q.vendedor_id !== userId && req.user!.tipo !== 'admin') {
      throw new HttpError(403, 'Apenas o vendedor do produto pode responder');
    }

    await pool.query(
      'UPDATE perguntas SET resposta = ?, respondida_em = NOW() WHERE id = ?',
      [resposta, perguntaId],
    );

    await notify(q.autor_id, {
      tipo: 'resposta',
      titulo: 'Sua pergunta foi respondida',
      mensagem: `${q.produto_nome}: ${resposta.slice(0, 140)}`,
      link: `/produto/${q.produto_id}`,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function listForSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, u.nome AS autor_nome, p.nome AS produto_nome
         FROM perguntas q
         JOIN produtos p ON p.id = q.produto_id
         JOIN usuarios u ON u.id = q.autor_id
        WHERE p.vendedor_id = ?
        ORDER BY (q.resposta IS NOT NULL), q.created_at DESC`,
      [userId],
    );
    res.json(
      rows.map((r) => ({ ...formatQuestion(r), produto_nome: r.produto_nome })),
    );
  } catch (err) {
    next(err);
  }
}
