import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer, type RegisteredUser } from '../helpers.js';

/** Cria um pedido (pago ou cancelado) do comprador para o produto do vendedor. */
async function fazerPedido(
  buyer: RegisteredUser,
  produtoId: number,
  opts: { falha?: boolean } = {},
): Promise<number> {
  await request(app)
    .post('/api/cart/items')
    .set('Authorization', bearer(buyer.token))
    .send({ produto_id: produtoId, quantidade: 1 });
  const checkout = await request(app)
    .post('/api/orders/checkout')
    .set('Authorization', bearer(buyer.token))
    .send({ metodo: 'pix', simular_falha: opts.falha ?? false });
  return checkout.body.pedido_id;
}

describe('Avaliações (integração — regras no banco)', () => {
  it('RN005 + RF07: avalia pedido pago e a reputação do vendedor é recalculada por trigger', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 5 });
    const buyer = await registerUser('comprador');
    const pedidoId = await fazerPedido(buyer, prod.id);

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', bearer(buyer.token))
      .send({ pedido_id: pedidoId, vendedor_id: seller.user.id, nota: 5, comentario: 'Ótimo!' });

    expect(res.status).toBe(201);
    expect(res.body.reputacao).toBe(5);
    expect(res.body.total_avaliacoes).toBe(1);

    // RF07 — a reputação aparece no produto do vendedor
    const produto = await request(app).get(`/api/products/${prod.id}`);
    expect(produto.body.vendedor_reputacao).toBe(5);
  });

  it('RF07: média é recalculada com múltiplas avaliações', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 10 });

    const buyer1 = await registerUser('comprador');
    const pedido1 = await fazerPedido(buyer1, prod.id);
    await request(app).post('/api/reviews').set('Authorization', bearer(buyer1.token))
      .send({ pedido_id: pedido1, vendedor_id: seller.user.id, nota: 4 });

    const buyer2 = await registerUser('comprador');
    const pedido2 = await fazerPedido(buyer2, prod.id);
    const res = await request(app).post('/api/reviews').set('Authorization', bearer(buyer2.token))
      .send({ pedido_id: pedido2, vendedor_id: seller.user.id, nota: 2 });

    expect(res.status).toBe(201);
    expect(res.body.reputacao).toBe(3); // (4 + 2) / 2
    expect(res.body.total_avaliacoes).toBe(2);
  });

  it('RN005: não permite avaliar pedido não pago (cancelado)', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 5 });
    const buyer = await registerUser('comprador');
    const pedidoId = await fazerPedido(buyer, prod.id, { falha: true });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', bearer(buyer.token))
      .send({ pedido_id: pedidoId, vendedor_id: seller.user.id, nota: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RN005|pago/i);
  });

  it('RN006: rejeita nota fora do intervalo 1..5', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 5 });
    const buyer = await registerUser('comprador');
    const pedidoId = await fazerPedido(buyer, prod.id);

    const alta = await request(app).post('/api/reviews').set('Authorization', bearer(buyer.token))
      .send({ pedido_id: pedidoId, vendedor_id: seller.user.id, nota: 6 });
    expect(alta.status).toBe(400);

    const baixa = await request(app).post('/api/reviews').set('Authorization', bearer(buyer.token))
      .send({ pedido_id: pedidoId, vendedor_id: seller.user.id, nota: 0 });
    expect(baixa.status).toBe(400);
  });

  it('rejeita avaliação duplicada do mesmo vendedor no mesmo pedido (409)', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { estoque: 5 });
    const buyer = await registerUser('comprador');
    const pedidoId = await fazerPedido(buyer, prod.id);

    const primeira = await request(app).post('/api/reviews').set('Authorization', bearer(buyer.token))
      .send({ pedido_id: pedidoId, vendedor_id: seller.user.id, nota: 5 });
    expect(primeira.status).toBe(201);

    const segunda = await request(app).post('/api/reviews').set('Authorization', bearer(buyer.token))
      .send({ pedido_id: pedidoId, vendedor_id: seller.user.id, nota: 3 });
    expect(segunda.status).toBe(409);
  });
});
