import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

/** Código único por teste para não colidir na tabela de cupons. */
function couponCode(): string {
  return `T${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

describe('Cupons de desconto (integração)', () => {
  it('vendedor cria cupom e o checkout aplica o desconto (percentual) abatendo no total', async () => {
    const codigo = couponCode();
    const seller = await registerUser('vendedor');
    const create = await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(seller.token))
      .send({ codigo, tipo: 'percentual', valor: 10 });
    expect(create.status).toBe(201);

    const prod = await createProduct(seller.token, { preco: 200, estoque: 5 });
    const buyer = await registerUser('comprador');

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(buyer.token))
      .send({ produto_id: prod.id, quantidade: 1 });

    const validate = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', bearer(buyer.token))
      .send({ codigo });
    expect(validate.status).toBe(200);
    expect(validate.body.desconto).toBe(20);

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(buyer.token))
      .send({ metodo: 'pix', cupom: codigo });
    expect(checkout.status).toBe(201);
    expect(checkout.body.total).toBe(180);
    expect(checkout.body.desconto).toBe(20);

    // Uso do cupom foi contabilizado e aparece para o vendedor dono.
    const list = await request(app).get('/api/coupons').set('Authorization', bearer(seller.token));
    const cupom = list.body.find((c: { codigo: string }) => c.codigo === codigo);
    expect(cupom.usos).toBe(1);
  });

  it('cupom fixo nunca deixa o total negativo', async () => {
    const codigo = couponCode();
    const seller = await registerUser('vendedor');
    await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(seller.token))
      .send({ codigo, tipo: 'fixo', valor: 500 });

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
      .send({ codigo: 'NAOEXISTE' });
    expect(res.status).toBe(404);
  });

  it('cupom inativo é rejeitado', async () => {
    const codigo = couponCode();
    const seller = await registerUser('vendedor');
    const create = await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(seller.token))
      .send({ codigo, tipo: 'percentual', valor: 10, ativo: false });
    expect(create.status).toBe(201);

    const buyer = await registerUser('comprador');
    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', bearer(buyer.token))
      .send({ codigo });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inativo/i);
  });

  it('comprador não pode gerenciar cupons (403)', async () => {
    const comum = await registerUser('comprador');
    const res = await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(comum.token))
      .send({ codigo: couponCode(), tipo: 'fixo', valor: 10 });
    expect(res.status).toBe(403);
  });

  it('o dono do cupom não pode usar o próprio cupom (validação e checkout)', async () => {
    const codigo = couponCode();
    const dono = await registerUser('vendedor');
    await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(dono.token))
      .send({ codigo, tipo: 'percentual', valor: 10 });

    // O próprio dono monta um carrinho (com produto de outro vendedor) e tenta usar.
    const outroVendedor = await registerUser('vendedor');
    const prod = await createProduct(outroVendedor.token, { preco: 200, estoque: 5 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', bearer(dono.token))
      .send({ produto_id: prod.id, quantidade: 1 });

    const validate = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', bearer(dono.token))
      .send({ codigo });
    expect(validate.status).toBe(400);
    expect(validate.body.error).toMatch(/cupom inválido/i);

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', bearer(dono.token))
      .send({ metodo: 'pix', cupom: codigo });
    expect(checkout.status).toBe(400);
  });

  it('um vendedor não enxerga nem altera o cupom de outro', async () => {
    const codigo = couponCode();
    const dono = await registerUser('vendedor');
    const create = await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(dono.token))
      .send({ codigo, tipo: 'percentual', valor: 15 });
    expect(create.status).toBe(201);
    const cupomId = create.body.id;

    const outro = await registerUser('vendedor');
    const list = await request(app).get('/api/coupons').set('Authorization', bearer(outro.token));
    expect(list.body.find((c: { codigo: string }) => c.codigo === codigo)).toBeUndefined();

    const tentativa = await request(app)
      .delete(`/api/coupons/${cupomId}`)
      .set('Authorization', bearer(outro.token));
    expect(tentativa.status).toBe(403);
  });
});
