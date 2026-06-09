import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';
import { pool } from '../../src/db/pool.js';
import type { RowDataPacket } from 'mysql2';

async function estoque(produtoId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT estoque FROM produtos WHERE id = ?', [produtoId]);
  return Number(rows[0].estoque);
}
async function statusPedido(pedidoId: number): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT status FROM pedidos WHERE id = ?', [pedidoId]);
  return rows[0].status;
}

describe('Fluxo de pagamento assíncrono (Mercado Pago) — SPs e trigger no banco', () => {
  it('GET /payments/mode indica modo simulado quando não há token MP nos testes', async () => {
    const res = await request(app).get('/api/payments/mode');
    expect(res.status).toBe(200);
    expect(res.body.mercadopago).toBe(false);
  });

  it('sp_criar_pedido_pendente cria pedido pendente SEM mexer no estoque; confirmação aprova, decrementa (RN004 no UPDATE) e limpa o carrinho', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 9, preco: 30 });
    const buyer = await registerUser('comprador');

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 4 });

    // cria pedido pendente (como faria o checkout com MP ativo)
    const [rs] = await pool.query<RowDataPacket[][]>(
      'CALL sp_criar_pedido_pendente(?, ?, ?, ?)',
      [buyer.user.id, 'pix', null, 0],
    );
    const pedidoId = Number(rs[0][0].pedido_id);

    expect(await statusPedido(pedidoId)).toBe('pendente');
    expect(await estoque(prod.id)).toBe(9); // estoque NÃO mexido enquanto pendente

    // confirma o pagamento (aprovado)
    await pool.query('CALL sp_confirmar_pagamento(?, ?)', [pedidoId, 1]);

    expect(await statusPedido(pedidoId)).toBe('pago');
    expect(await estoque(prod.id)).toBe(5); // 9 - 4, decremento pelo trigger no UPDATE

    // carrinho do comprador foi esvaziado
    const cart = await request(app).get('/api/cart').set('Authorization', bearer(buyer.token));
    expect(cart.body.items).toHaveLength(0);
  });

  it('confirmação recusada cancela o pedido e NÃO mexe no estoque', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 6, preco: 40 });
    const buyer = await registerUser('comprador');

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 2 });

    const [rs] = await pool.query<RowDataPacket[][]>(
      'CALL sp_criar_pedido_pendente(?, ?, ?, ?)',
      [buyer.user.id, 'pix', null, 0],
    );
    const pedidoId = Number(rs[0][0].pedido_id);

    await pool.query('CALL sp_confirmar_pagamento(?, ?)', [pedidoId, 0]);

    expect(await statusPedido(pedidoId)).toBe('cancelado');
    expect(await estoque(prod.id)).toBe(6); // inalterado
  });

  it('POST /orders/:id/confirm não permite confirmar pedido de outro usuário (403)', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 5 });
    const buyer = await registerUser('comprador');
    await request(app).post('/api/cart/items').set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 1 });
    const checkout = await request(app).post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token)).send({ metodo: 'pix' });

    const intruso = await registerUser('comprador');
    const res = await request(app)
      .post(`/api/orders/${checkout.body.pedido_id}/confirm`)
      .set('Authorization', bearer(intruso.token));
    expect(res.status).toBe(403);
  });
});
