import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

/** Cria um pedido pago e devolve o id (seller, buyer e produto novos). */
async function pedidoPago() {
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
    .send({ metodo: 'pix' });
  return { seller, buyer, prod, pedidoId: checkout.body.pedido_id as number };
}

describe('Rastreamento do pedido (integração — timeline no banco)', () => {
  it('o pedido pago já tem evento de timeline gerado por trigger', async () => {
    const { buyer, pedidoId } = await pedidoPago();
    const track = await request(app)
      .get(`/api/orders/${pedidoId}/tracking`)
      .set('Authorization', bearer(buyer.token));
    expect(track.status).toBe(200);
    expect(track.body.status).toBe('pago');
    expect(track.body.eventos.length).toBeGreaterThanOrEqual(1);
    expect(track.body.eventos.some((e: { status: string }) => e.status === 'pago')).toBe(true);
  });

  it('vendedor avança pago → preparando → enviado → entregue; cada passo vira evento + notifica o comprador', async () => {
    const { seller, buyer, pedidoId } = await pedidoPago();

    for (const status of ['preparando', 'enviado', 'entregue']) {
      const res = await request(app)
        .patch(`/api/orders/${pedidoId}/status`)
        .set('Authorization', bearer(seller.token))
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }

    const track = await request(app)
      .get(`/api/orders/${pedidoId}/tracking`)
      .set('Authorization', bearer(buyer.token));
    const statuses = track.body.eventos.map((e: { status: string }) => e.status);
    expect(statuses).toEqual(expect.arrayContaining(['pago', 'preparando', 'enviado', 'entregue']));
    expect(track.body.proximo_status).toBe(null);

    // Comprador recebeu notificações das mudanças de status (geradas por trigger).
    const notifs = await request(app).get('/api/notifications').set('Authorization', bearer(buyer.token));
    expect(notifs.body.items.some((n: { tipo: string }) => n.tipo === 'pedido')).toBe(true);
  });

  it('rejeita transição inválida (pular etapas)', async () => {
    const { seller, pedidoId } = await pedidoPago();
    const res = await request(app)
      .patch(`/api/orders/${pedidoId}/status`)
      .set('Authorization', bearer(seller.token))
      .send({ status: 'entregue' });
    expect(res.status).toBe(400);
  });

  it('quem não participa do pedido não avança o status (403)', async () => {
    const { pedidoId } = await pedidoPago();
    const intruso = await registerUser('vendedor');
    const res = await request(app)
      .patch(`/api/orders/${pedidoId}/status`)
      .set('Authorization', bearer(intruso.token))
      .send({ status: 'preparando' });
    expect(res.status).toBe(403);
  });
});

describe('Notificações (integração)', () => {
  it('marcar todas como lidas zera o contador', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token);
    const buyer = await registerUser('comprador');
    // Gera uma notificação de pergunta para o vendedor.
    await request(app)
      .post(`/api/products/${prod.id}/questions`)
      .set('Authorization', bearer(buyer.token))
      .send({ pergunta: 'Disponível?' });

    const before = await request(app).get('/api/notifications').set('Authorization', bearer(seller.token));
    expect(before.body.nao_lidas).toBeGreaterThanOrEqual(1);

    await request(app).put('/api/notifications/read-all').set('Authorization', bearer(seller.token));

    const after = await request(app).get('/api/notifications').set('Authorization', bearer(seller.token));
    expect(after.body.nao_lidas).toBe(0);
  });
});
