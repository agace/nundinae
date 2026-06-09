import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import type { RowDataPacket } from 'mysql2';

interface CartRow extends RowDataPacket { id: number }
interface ItemRow extends RowDataPacket {
  id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  produto_nome: string;
  produto_imagem: string | null;
  produto_estoque: number;
  vendedor_id: number;
  vendedor_nome: string;
}

async function getOrCreateCart(usuarioId: number): Promise<number> {
  const [rows] = await pool.query<CartRow[]>(
    'SELECT id FROM carrinhos WHERE usuario_id = ?',
    [usuarioId],
  );
  if (rows.length > 0) return rows[0].id;
  const [result] = await pool.query<RowDataPacket[] & { insertId: number }>(
    'INSERT INTO carrinhos (usuario_id) VALUES (?)',
    [usuarioId],
  ) as unknown as [{ insertId: number }, unknown];
  return result.insertId;
}

async function fetchItems(carrinhoId: number) {
  const [items] = await pool.query<ItemRow[]>(
    `SELECT ic.id, ic.produto_id, ic.quantidade, ic.preco_unitario,
            p.nome AS produto_nome, p.imagem AS produto_imagem,
            p.estoque AS produto_estoque, p.vendedor_id, u.nome AS vendedor_nome
       FROM itens_carrinho ic
       JOIN produtos p ON p.id = ic.produto_id
       JOIN usuarios u ON u.id = p.vendedor_id
      WHERE ic.carrinho_id = ?`,
    [carrinhoId],
  );
  const formatted = items.map((i) => ({
    id: i.id,
    produto_id: i.produto_id,
    produto_nome: i.produto_nome,
    produto_imagem: i.produto_imagem,
    produto_estoque: i.produto_estoque,
    vendedor_id: i.vendedor_id,
    vendedor_nome: i.vendedor_nome,
    quantidade: i.quantidade,
    preco_unitario: Number(i.preco_unitario),
    subtotal: Number(i.preco_unitario) * i.quantidade,
  }));
  const total = formatted.reduce((acc, i) => acc + i.subtotal, 0);
  return { items: formatted, total };
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carrinhoId = await getOrCreateCart(req.user!.sub);
    res.json(await fetchItems(carrinhoId));
  } catch (err) {
    next(err);
  }
}

const addSchema = z.object({
  produto_id: z.number().int().positive(),
  quantidade: z.number().int().positive().default(1),
});

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = addSchema.parse(req.body);
    const userId = req.user!.sub;

    // RN003 (vendedor não compra próprio produto), disponibilidade e estoque
    // são validados por trigger no banco ao inserir/atualizar o item. Aqui só
    // buscamos o preço para registrar o preço unitário no carrinho.
    const [prodRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, preco FROM produtos WHERE id = ?',
      [data.produto_id],
    );
    const prod = prodRows[0];
    if (!prod) throw new HttpError(404, 'Produto indisponível');

    const carrinhoId = await getOrCreateCart(userId);

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id, quantidade FROM itens_carrinho WHERE carrinho_id = ? AND produto_id = ?',
      [carrinhoId, data.produto_id],
    );
    if (existing.length > 0) {
      const novaQtd = existing[0].quantidade + data.quantidade;
      await pool.query(
        'UPDATE itens_carrinho SET quantidade = ? WHERE id = ?',
        [novaQtd, existing[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO itens_carrinho (carrinho_id, produto_id, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?)`,
        [carrinhoId, data.produto_id, data.quantidade, prod.preco],
      );
    }

    res.status(201).json(await fetchItems(carrinhoId));
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  quantidade: z.number().int().positive(),
});

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = Number(req.params.itemId);
    const data = updateSchema.parse(req.body);
    const userId = req.user!.sub;
    const carrinhoId = await getOrCreateCart(userId);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ic.id, p.estoque
         FROM itens_carrinho ic
         JOIN produtos p ON p.id = ic.produto_id
        WHERE ic.id = ? AND ic.carrinho_id = ?`,
      [itemId, carrinhoId],
    );
    if (rows.length === 0) throw new HttpError(404, 'Item não encontrado');
    if (data.quantidade > rows[0].estoque) throw new HttpError(400, 'Estoque insuficiente');

    await pool.query('UPDATE itens_carrinho SET quantidade = ? WHERE id = ?', [
      data.quantidade,
      itemId,
    ]);
    res.json(await fetchItems(carrinhoId));
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = Number(req.params.itemId);
    const userId = req.user!.sub;
    const carrinhoId = await getOrCreateCart(userId);

    await pool.query(
      'DELETE FROM itens_carrinho WHERE id = ? AND carrinho_id = ?',
      [itemId, carrinhoId],
    );
    res.json(await fetchItems(carrinhoId));
  } catch (err) {
    next(err);
  }
}

export async function clear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carrinhoId = await getOrCreateCart(req.user!.sub);
    await pool.query('DELETE FROM itens_carrinho WHERE carrinho_id = ?', [carrinhoId]);
    res.json({ items: [], total: 0 });
  } catch (err) {
    next(err);
  }
}
