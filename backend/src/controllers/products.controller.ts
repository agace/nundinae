import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { parseId } from '../utils/params.js';
import * as uploadService from '../services/upload.service.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const productSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  descricao: z.string().max(2000).optional(),
  preco: z.number().positive().max(1_000_000),
  imagem: z.string().optional().nullable(),
  estoque: z.number().int().min(0).max(1_000_000),
  categoria: z.string().trim().min(1).max(100),
  ativo: z.boolean().optional(),
});

export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new HttpError(400, 'Envie um arquivo de imagem (JPG, PNG, etc.)'));
  },
});

export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user!.tipo === 'comprador') {
      throw new HttpError(403, 'Apenas vendedores podem enviar imagens de produto');
    }
    if (!req.file) throw new HttpError(400, 'Nenhuma imagem enviada');
    const url = await uploadService.uploadProductImage(req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

interface ProductRow extends RowDataPacket {
  id: number;
  vendedor_id: number;
  vendedor_nome: string;
  vendedor_reputacao: number;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string | null;
  estoque: number;
  categoria: string;
  ativo: number;
  created_at: Date;
}

const BASE_SELECT = `
  SELECT p.*, u.nome AS vendedor_nome, u.reputacao AS vendedor_reputacao
  FROM produtos p
  JOIN usuarios u ON u.id = p.vendedor_id
`;

function formatProduct(row: ProductRow) {
  return {
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
  };
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, categoria, vendedor_id } = req.query;
    const filters: string[] = ['p.ativo = 1'];
    const params: (string | number)[] = [];

    if (typeof q === 'string' && q.trim()) {
      // Escapa os curingas do LIKE para que "%" digitado na busca seja literal.
      const termo = `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      filters.push('(p.nome LIKE ? OR p.descricao LIKE ?)');
      params.push(termo, termo);
    }
    if (typeof categoria === 'string' && categoria.trim()) {
      filters.push('p.categoria = ?');
      params.push(categoria);
    }
    if (typeof vendedor_id === 'string' && vendedor_id.trim()) {
      const vendedor = Number(vendedor_id);
      if (!Number.isInteger(vendedor) || vendedor <= 0) {
        throw new HttpError(400, 'vendedor_id inválido');
      }
      filters.push('p.vendedor_id = ?');
      params.push(vendedor);
    }

    const [rows] = await pool.query<ProductRow[]>(
      `${BASE_SELECT} WHERE ${filters.join(' AND ')} ORDER BY p.created_at DESC LIMIT 100`,
      params,
    );
    res.json(rows.map(formatProduct));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id, 'Produto');
    // Rota pública: produto removido (soft delete) não deve continuar acessível
    // por link direto.
    const [rows] = await pool.query<ProductRow[]>(
      `${BASE_SELECT} WHERE p.id = ? AND p.ativo = 1`,
      [id],
    );
    if (rows.length === 0) throw new HttpError(404, 'Produto não encontrado');
    res.json(formatProduct(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = productSchema.parse(req.body);
    const vendedorId = req.user!.sub;

    if (req.user!.tipo === 'comprador') {
      throw new HttpError(403, 'Apenas vendedores podem cadastrar produtos');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO produtos (vendedor_id, nome, descricao, preco, imagem, estoque, categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [vendedorId, data.nome, data.descricao ?? '', data.preco, data.imagem ?? null, data.estoque, data.categoria],
    );

    const [rows] = await pool.query<ProductRow[]>(
      `${BASE_SELECT} WHERE p.id = ?`,
      [result.insertId],
    );
    res.status(201).json(formatProduct(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id, 'Produto');
    const data = productSchema.partial().parse(req.body);
    const userId = req.user!.sub;

    const [ownerRows] = await pool.query<RowDataPacket[]>(
      'SELECT vendedor_id FROM produtos WHERE id = ?',
      [id],
    );
    if (ownerRows.length === 0) throw new HttpError(404, 'Produto não encontrado');
    if (ownerRows[0].vendedor_id !== userId && req.user!.tipo !== 'admin') {
      throw new HttpError(403, 'Você não pode editar este produto');
    }

    // As chaves vêm do schema do zod (que descarta campos desconhecidos), então
    // nunca chega nome de coluna arbitrário na montagem do SET.
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [k, v] of Object.entries(data)) {
      fields.push(`${k} = ?`);
      values.push(typeof v === 'boolean' ? Number(v) : (v as string | number | null));
    }
    if (fields.length === 0) {
      res.json({ ok: true });
      return;
    }
    values.push(id);
    await pool.query(`UPDATE produtos SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query<ProductRow[]>(`${BASE_SELECT} WHERE p.id = ?`, [id]);
    res.json(formatProduct(rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params.id, 'Produto');
    const userId = req.user!.sub;

    const [ownerRows] = await pool.query<RowDataPacket[]>(
      'SELECT vendedor_id FROM produtos WHERE id = ?',
      [id],
    );
    if (ownerRows.length === 0) throw new HttpError(404, 'Produto não encontrado');
    if (ownerRows[0].vendedor_id !== userId && req.user!.tipo !== 'admin') {
      throw new HttpError(403, 'Você não pode excluir este produto');
    }

    await pool.query('UPDATE produtos SET ativo = 0 WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function categories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT categoria, COUNT(*) AS total FROM produtos WHERE ativo = 1 GROUP BY categoria ORDER BY categoria',
    );
    res.json(rows.map((r) => ({ categoria: r.categoria, total: Number(r.total) })));
  } catch (err) {
    next(err);
  }
}
