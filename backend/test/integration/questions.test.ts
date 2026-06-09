import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

describe('Perguntas e respostas no anúncio (integração)', () => {
  it('comprador pergunta, vendedor responde e ambos veem o histórico', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { nome: 'Ânfora Q&A' });
    const buyer = await registerUser('comprador');

    const ask = await request(app)
      .post(`/api/products/${prod.id}/questions`)
      .set('Authorization', bearer(buyer.token))
      .send({ pergunta: 'Tem em outra cor?' });
    expect(ask.status).toBe(201);
    const perguntaId = ask.body.id;

    // O vendedor recebeu notificação da pergunta.
    const notifs = await request(app).get('/api/notifications').set('Authorization', bearer(seller.token));
    expect(notifs.body.items.some((n: { tipo: string }) => n.tipo === 'pergunta')).toBe(true);

    const answer = await request(app)
      .post(`/api/questions/${perguntaId}/answer`)
      .set('Authorization', bearer(seller.token))
      .send({ resposta: 'Sim, temos em vinho e dourado.' });
    expect(answer.status).toBe(200);

    const list = await request(app).get(`/api/products/${prod.id}/questions`);
    expect(list.status).toBe(200);
    expect(list.body[0].resposta).toMatch(/vinho/);

    // O autor recebeu notificação da resposta.
    const buyerNotifs = await request(app).get('/api/notifications').set('Authorization', bearer(buyer.token));
    expect(buyerNotifs.body.items.some((n: { tipo: string }) => n.tipo === 'resposta')).toBe(true);
  });

  it('vendedor não pode perguntar no próprio produto', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token);
    const res = await request(app)
      .post(`/api/products/${prod.id}/questions`)
      .set('Authorization', bearer(seller.token))
      .send({ pergunta: 'Pergunta inválida?' });
    expect(res.status).toBe(400);
  });

  it('apenas o dono do produto pode responder (403)', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token);
    const buyer = await registerUser('comprador');
    const intruso = await registerUser('vendedor');

    const ask = await request(app)
      .post(`/api/products/${prod.id}/questions`)
      .set('Authorization', bearer(buyer.token))
      .send({ pergunta: 'Pergunta?' });

    const res = await request(app)
      .post(`/api/questions/${ask.body.id}/answer`)
      .set('Authorization', bearer(intruso.token))
      .send({ resposta: 'Resposta indevida' });
    expect(res.status).toBe(403);
  });
});
