import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

describe('Carrinho + Checkout (integração — regras no banco)', () => {
  it('RN003: vendedor não pode adicionar o próprio produto ao carrinho', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 5 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(seller.token))
      .send({ produto_id: prod.id, quantidade: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RN003/i);
  });

  it('RN004: checkout aprovado cria pedido pago, decrementa estoque e limpa o carrinho', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 10, preco: 50 });
    const buyer = await registerUser('comprador');

    const add = await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 3 });
    expect(add.status).toBe(201);

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token))
      .send({ metodo: 'pix' });
    expect(checkout.status).toBe(201);
    expect(checkout.body.status).toBe('pago');
    expect(checkout.body.total).toBe(150);

    // RN004 — estoque foi decrementado pelo trigger do banco (10 - 3 = 7)
    const after = await request(app).get(`/api/products/${prod.id}`);
    expect(after.body.estoque).toBe(7);

    // carrinho foi esvaziado
    const cart = await request(app).get('/api/cart').set('Authorization', bearer(buyer.token));
    expect(cart.body.items).toHaveLength(0);
  });

  it('checkout com falha simulada cancela o pedido e NÃO mexe no estoque', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 4, preco: 80 });
    const buyer = await registerUser('comprador');

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 2 });

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token))
      .send({ metodo: 'cartao', simular_falha: true });
    expect(checkout.status).toBe(201);
    expect(checkout.body.status).toBe('cancelado');

    const after = await request(app).get(`/api/products/${prod.id}`);
    expect(after.body.estoque).toBe(4); // inalterado
  });

  it('não permite adicionar quantidade acima do estoque', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 2 });
    const buyer = await registerUser('comprador');

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/estoque/i);
  });

  it('checkout com carrinho vazio retorna 400', async () => {
    const buyer = await registerUser('comprador');
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token))
      .send({ metodo: 'pix' });
    expect(res.status).toBe(400);
  });
});
