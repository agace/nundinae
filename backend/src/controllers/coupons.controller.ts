import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CouponResult {
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  desconto: number;
}

/**
 * Valida um cupom para um subtotal e devolve o desconto calculado.
 * É a fonte da verdade do desconto — o checkout NUNCA confia no valor do cliente,
 * sempre revalida por aqui. Lança HttpError(400) quando o cupom não serve.
 */
export async function validateCoupon(codigoRaw: string, subtotal: number): Promise<CouponResult> {
  const codigo = codigoRaw.trim().toUpperCase();
  if (!codigo) throw new HttpError(400, 'Informe um cupom');

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT codigo, tipo, valor, ativo, validade, usos_max, usos FROM cupons WHERE codigo = ?',
    [codigo],
  );
  const c = rows[0];
  if (!c) throw new HttpError(404, 'Cupom inexistente');
  if (!c.ativo) throw new HttpError(400, 'Cupom inativo');
  if (c.validade && new Date(c.validade) < new Date(new Date().toDateString())) {
    throw new HttpError(400, 'Cupom expirado');
  }
  if (c.usos_max !== null && c.usos >= c.usos_max) {
    throw new HttpError(400, 'Cupom esgotado');
  }

  const valor = Number(c.valor);
  const bruto = c.tipo === 'percentual' ? (subtotal * valor) / 100 : valor;
  const desconto = Math.min(Math.round(bruto * 100) / 100, subtotal);

  return { codigo: c.codigo, tipo: c.tipo, valor, desconto };
}

/** Endpoint público (autenticado): valida um cupom contra o subtotal informado. */
export async function validate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ codigo: z.string().min(1), subtotal: z.number().nonnegative() });
    const { codigo, subtotal } = schema.parse(req.body);
    const result = await validateCoupon(codigo, subtotal);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// --- Administração de cupons (RF09 — admin) -------------------------------

const couponSchema = z.object({
  codigo: z.string().min(2).max(40),
  tipo: z.enum(['percentual', 'fixo']),
  valor: z.number().positive(),
  ativo: z.boolean().optional(),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  usos_max: z.number().int().positive().optional().nullable(),
});

function formatCoupon(r: RowDataPacket) {
  return {
    id: r.id,
    codigo: r.codigo,
    tipo: r.tipo,
    valor: Number(r.valor),
    ativo: Boolean(r.ativo),
    validade: r.validade,
    usos_max: r.usos_max,
    usos: r.usos,
    created_at: r.created_at,
  };
}

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM cupons ORDER BY created_at DESC');
    res.json(rows.map(formatCoupon));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = couponSchema.parse(req.body);
    const codigo = data.codigo.trim().toUpperCase();
    if (data.tipo === 'percentual' && data.valor > 100) {
      throw new HttpError(400, 'Cupom percentual não pode passar de 100%');
    }
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO cupons (codigo, tipo, valor, ativo, validade, usos_max)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [codigo, data.tipo, data.valor, data.ativo === false ? 0 : 1, data.validade ?? null, data.usos_max ?? null],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM cupons WHERE id = ?', [result.insertId]);
    res.status(201).json(formatCoupon(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const data = couponSchema.partial().parse(req.body);

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'codigo' && typeof v === 'string') {
        fields.push('codigo = ?');
        values.push(v.trim().toUpperCase());
      } else if (k === 'ativo') {
        fields.push('ativo = ?');
        values.push(v ? 1 : 0);
      } else {
        fields.push(`${k} = ?`);
        values.push(v as string | number | null);
      }
    }
    if (fields.length === 0) {
      res.json({ ok: true });
      return;
    }
    values.push(id);
    await pool.query(`UPDATE cupons SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM cupons WHERE id = ?', [id]);
    if (rows.length === 0) throw new HttpError(404, 'Cupom não encontrado');
    res.json(formatCoupon(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM cupons WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
