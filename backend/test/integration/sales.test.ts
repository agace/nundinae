import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

describe('Vendas do vendedor (integração)', () => {
  it('lista a venda após o comprador finalizar o pedido', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { nome: 'Item Vendido', preco: 40, estoque: 5 });
    const buyer = await registerUser('comprador');

    await request(app).post('/api/cart/items').set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 2 });
    const checkout = await request(app).post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token)).send({ metodo: 'pix' });
    expect(checkout.status).toBe(201);
    expect(checkout.body.pagamento).toBe('aprovado');

    const sales = await request(app).get('/api/orders/sales').set('Authorization', bearer(seller.token));
    expect(sales.status).toBe(200);
    const venda = sales.body.find((s: { produto_id: number }) => s.produto_id === prod.id);
    expect(venda).toBeTruthy();
    expect(venda.status).toBe('pago');
    expect(venda.quantidade).toBe(2);
    expect(venda.subtotal).toBe(80);
    expect(venda.comprador_nome).toBeTruthy();
  });

  it('um vendedor não vê as vendas de outro vendedor', async () => {
    const sellerA = await registerUser('vendedor');
    const prodA = await createProduct(sellerA.token, { preco: 25, estoque: 3 });
    const buyer = await registerUser('comprador');
    await request(app).post('/api/cart/items').set('Authorization', bearer(buyer.token))
      .send({ produto_id: prodA.id, quantidade: 1 });
    await request(app).post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token)).send({ metodo: 'pix' });

    const sellerB = await registerUser('vendedor');
    const sales = await request(app).get('/api/orders/sales').set('Authorization', bearer(sellerB.token));
    expect(sales.status).toBe(200);
    expect(sales.body.find((s: { produto_id: number }) => s.produto_id === prodA.id)).toBeFalsy();
  });

  it('exige autenticação (401)', async () => {
    const res = await request(app).get('/api/orders/sales');
    expect(res.status).toBe(401);
  });
});
