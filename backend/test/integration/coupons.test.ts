import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, registerUser, createProduct, bearer, uniqueEmail } from '../helpers.js';

let adminToken: string;

beforeAll(async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@nundinae.com', senha: 'admin123' });
  adminToken = res.body.token;
});

/** Código único por teste para não colidir na tabela de cupons. */
function couponCode(): string {
  return `T${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

describe('Cupons de desconto (integração)', () => {
  it('admin cria cupom e o checkout aplica o desconto (percentual) abatendo no total', async () => {
    const codigo = couponCode();
    const create = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', bearer(adminToken))
      .send({ codigo, tipo: 'percentual', valor: 10 });
    expect(create.status).toBe(201);

    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { preco: 200, estoque: 5 });
    const buyer = await registerUser('comprador');

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 1 });

    const validate = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', bearer(buyer.token))
      .send({ codigo, subtotal: 200 });
    expect(validate.status).toBe(200);
    expect(validate.body.desconto).toBe(20);

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token))
      .send({ metodo: 'pix', cupom: codigo });
    expect(checkout.status).toBe(201);
    expect(checkout.body.total).toBe(180);
    expect(checkout.body.desconto).toBe(20);

    // Uso do cupom foi contabilizado.
    const list = await request(app).get('/api/admin/coupons').set('Authorization', bearer(adminToken));
    const cupom = list.body.find((c: { codigo: string }) => c.codigo === codigo);
    expect(cupom.usos).toBe(1);
  });

  it('cupom fixo nunca deixa o total negativo', async () => {
    const codigo = couponCode();
    await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', bearer(adminToken))
      .send({ codigo, tipo: 'fixo', valor: 500 });

    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { preco: 100, estoque: 5 });
    const buyer = await registerUser('comprador');
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 1 });

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token))
      .send({ metodo: 'pix', cupom: codigo });
    expect(checkout.body.total).toBe(0);
    expect(checkout.body.desconto).toBe(100);
  });

  it('cupom inexistente é rejeitado na validação', async () => {
    const buyer = await registerUser('comprador');
    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', bearer(buyer.token))
      .send({ codigo: 'NAOEXISTE', subtotal: 100 });
    expect(res.status).toBe(404);
  });

  it('cupom inativo é rejeitado', async () => {
    const codigo = couponCode();
    const create = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', bearer(adminToken))
      .send({ codigo, tipo: 'percentual', valor: 10, ativo: false });
    expect(create.status).toBe(201);

    const buyer = await registerUser('comprador');
    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', bearer(buyer.token))
      .send({ codigo, subtotal: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inativo/i);
  });

  it('só o admin gerencia cupons (403 para comum)', async () => {
    const comum = await registerUser('comprador');
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', bearer(comum.token))
      .send({ codigo: couponCode(), tipo: 'fixo', valor: 10, email: uniqueEmail() });
    expect(res.status).toBe(403);
  });
});
