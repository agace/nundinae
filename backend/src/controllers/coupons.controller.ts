import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { parseId } from '../utils/params.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CouponResult {
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  desconto: number;
}

async function cartSubtotal(userId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(ic.preco_unitario * ic.quantidade), 0) AS subtotal
       FROM itens_carrinho ic
       JOIN carrinhos c ON c.id = ic.carrinho_id
      WHERE c.usuario_id = ?`,
    [userId],
  );
  return Number(rows[0]?.subtotal ?? 0);
}

// Fonte da verdade do desconto: o checkout sempre revalida por aqui em vez de
// aceitar o valor vindo do cliente. O vendedor não resgata o próprio cupom.
export async function validateCoupon(codigoRaw: string, userId: number): Promise<CouponResult> {
  const codigo = codigoRaw.trim().toUpperCase();
  if (!codigo) throw new HttpError(400, 'Informe um cupom');

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT codigo, tipo, valor, ativo, validade, usos_max, usos, vendedor_id FROM cupons WHERE codigo = ?',
    [codigo],
  );
  const c = rows[0];
  if (!c) throw new HttpError(404, 'Cupom inexistente');
  if (c.vendedor_id === userId) {
    throw new HttpError(400, 'Cupom inválido');
  }
  if (!c.ativo) throw new HttpError(400, 'Cupom inativo');
  if (c.validade && new Date(c.validade) < new Date(new Date().toDateString())) {
    throw new HttpError(400, 'Cupom expirado');
  }
  if (c.usos_max !== null && c.usos >= c.usos_max) {
    throw new HttpError(400, 'Cupom esgotado');
  }

  const subtotal = await cartSubtotal(userId);
  if (subtotal <= 0) throw new HttpError(400, 'Carrinho vazio');

  const valor = Number(c.valor);
  const bruto = c.tipo === 'percentual' ? (subtotal * valor) / 100 : valor;
  const desconto = Math.min(Math.round(bruto * 100) / 100, subtotal);

  return { codigo: c.codigo, tipo: c.tipo, valor, desconto };
}

export async function validate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ codigo: z.string().min(1) });
    const { codigo } = schema.parse(req.body);
    const result = await validateCoupon(codigo, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Cada vendedor gerencia os próprios cupons. O escopo é só de posse: o
// desconto continua incidindo sobre o carrinho inteiro no checkout.
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
    vendedor_id: r.vendedor_id,
    created_at: r.created_at,
  };
}

async function ownedCoupon(id: number, vendedorId: number): Promise<RowDataPacket> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM cupons WHERE id = ?', [id]);
  const c = rows[0];
  if (!c) throw new HttpError(404, 'Cupom não encontrado');
  if (c.vendedor_id !== vendedorId) throw new HttpError(403, 'Este cupom não é seu');
  return c;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM cupons WHERE vendedor_id = ? ORDER BY created_at DESC',
      [req.user!.sub],
    );
    res.json(rows.map(formatCoupon));
  } catch (err) {
    next(err);
  }
}

function assertPercentualValido(tipo: string | undefined, valor: number | undefined): void {
  if (tipo === 'percentual' && valor !== undefined && valor > 100) {
    throw new HttpError(400, 'Cupom percentual não pode passar de 100%');
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = couponSchema.parse(req.body);
    const codigo = data.codigo.trim().toUpperCase();
    assertPercentualValido(data.tipo, data.valor);
    let result: ResultSetHeader;
    try {
      [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO cupons (codigo, tipo, valor, ativo, validade, usos_max, vendedor_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [codigo, data.tipo, data.valor, data.ativo === false ? 0 : 1, data.validade ?? null, data.usos_max ?? null, req.user!.sub],
      );
    } catch (e) {
      if ((e as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, `Já existe um cupom com o código ${codigo}`);
      }
      throw e;
    }
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM cupons WHERE id = ?', [result.insertId]);
    res.status(201).json(formatCoupon(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id, 'Cupom');
    const vendedorId = req.user!.sub;
    const atual = await ownedCoupon(id, vendedorId);
    const data = couponSchema.partial().parse(req.body);

    // O tipo pode não vir no corpo da edição: valida contra o tipo já gravado.
    assertPercentualValido(data.tipo ?? atual.tipo, data.valor);

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
    res.json(formatCoupon(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id, 'Cupom');
    await ownedCoupon(id, req.user!.sub);
    await pool.query('DELETE FROM cupons WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
