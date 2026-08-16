import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

let adminToken: string;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@nundinae.com', senha: 'admin123' });
  expect(res.status).toBe(200);
  adminToken = res.body.token;
});

describe('Sessão reflete o estado atual da conta', () => {
  it('invalida o token que o usuário já tinha quando o admin bloqueia a conta', async () => {
    const alvo = await registerUser('comprador');

    const antes = await request(app).get('/api/auth/me').set('Authorization', bearer(alvo.token));
    expect(antes.status).toBe(200);

    await request(app)
      .patch(`/api/admin/users/${alvo.user.id}/status`)
      .set('Authorization', bearer(adminToken))
      .send({ ativo: false })
      .expect(200);

    // O token continua com assinatura válida, mas a conta não está mais ativa.
    const depois = await request(app).get('/api/auth/me').set('Authorization', bearer(alvo.token));
    expect(depois.status).toBe(403);
  });

  it('aplica o rebaixamento de papel sem esperar o token expirar', async () => {
    const vendedor = await registerUser('vendedor');

    await request(app)
      .get('/api/coupons')
      .set('Authorization', bearer(vendedor.token))
      .expect(200);

    await request(app)
      .patch(`/api/admin/users/${vendedor.user.id}/tipo`)
      .set('Authorization', bearer(adminToken))
      .send({ tipo: 'comprador' })
      .expect(200);

    const depois = await request(app)
      .get('/api/coupons')
      .set('Authorization', bearer(vendedor.token));
    expect(depois.status).toBe(403);
  });
});

describe('Proteções da conta de administrador', () => {
  it('não deixa rebaixar outro administrador', async () => {
    const outroAdmin = await registerUser('comprador');
    await request(app)
      .patch(`/api/admin/users/${outroAdmin.user.id}/tipo`)
      .set('Authorization', bearer(adminToken))
      .send({ tipo: 'admin' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/admin/users/${outroAdmin.user.id}/tipo`)
      .set('Authorization', bearer(adminToken))
      .send({ tipo: 'comprador' });
    expect(res.status).toBe(400);
  });
});

describe('Validação de parâmetros de rota', () => {
  it('responde 400 em id não numérico em vez de tratar como inexistente', async () => {
    const res = await request(app).get('/api/products/abc');
    expect(res.status).toBe(400);
  });

  it('responde 404 em JSON para rota inexistente', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});

describe('Produto removido', () => {
  it('deixa de ser acessível por link direto após o soft delete', async () => {
    const vendedor = await registerUser('vendedor');
    const produto = await createProduct(vendedor.token);

    await request(app).get(`/api/products/${produto.id}`).expect(200);

    await request(app)
      .delete(`/api/products/${produto.id}`)
      .set('Authorization', bearer(vendedor.token))
      .expect(200);

    const res = await request(app).get(`/api/products/${produto.id}`);
    expect(res.status).toBe(404);
  });
});

describe('Cupom percentual', () => {
  it('recusa passar de 100% também na edição', async () => {
    const vendedor = await registerUser('vendedor');
    const codigo = `TESTE${Date.now().toString().slice(-8)}`;

    const criado = await request(app)
      .post('/api/coupons')
      .set('Authorization', bearer(vendedor.token))
      .send({ codigo, tipo: 'percentual', valor: 10 });
    expect(criado.status).toBe(201);

    const res = await request(app)
      .put(`/api/coupons/${criado.body.id}`)
      .set('Authorization', bearer(vendedor.token))
      .send({ valor: 500 });
    expect(res.status).toBe(400);
  });
});
