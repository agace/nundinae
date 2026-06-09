import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, registerUser, bearer } from '../helpers.js';

let adminToken: string;
let adminId: number;

beforeAll(async () => {
  // Admin vem do seed (admin@nundinae.com / admin123).
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@nundinae.com', senha: 'admin123' });
  expect(res.status).toBe(200);
  adminToken = res.body.token;
  adminId = res.body.user.id;
});

describe('Admin / RF09 (integração)', () => {
  it('lista usuários e estatísticas para o admin', async () => {
    const users = await request(app).get('/api/admin/users').set('Authorization', bearer(adminToken));
    expect(users.status).toBe(200);
    expect(Array.isArray(users.body)).toBe(true);
    expect(users.body.length).toBeGreaterThanOrEqual(5);

    const stats = await request(app).get('/api/admin/stats').set('Authorization', bearer(adminToken));
    expect(stats.status).toBe(200);
    expect(typeof stats.body.usuarios).toBe('number');
  });

  it('nega acesso a quem não é admin (403)', async () => {
    const comum = await registerUser('comprador');
    const res = await request(app).get('/api/admin/users').set('Authorization', bearer(comum.token));
    expect(res.status).toBe(403);
  });

  it('bloqueia um usuário e impede o login dele', async () => {
    const alvo = await registerUser('comprador');

    const bloqueia = await request(app)
      .patch(`/api/admin/users/${alvo.user.id}/status`)
      .set('Authorization', bearer(adminToken))
      .send({ ativo: false });
    expect(bloqueia.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: alvo.email, senha: alvo.senha });
    expect(login.status).toBe(403);

    // reativa e o login volta a funcionar
    const reativa = await request(app)
      .patch(`/api/admin/users/${alvo.user.id}/status`)
      .set('Authorization', bearer(adminToken))
      .send({ ativo: true });
    expect(reativa.status).toBe(200);

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: alvo.email, senha: alvo.senha });
    expect(login2.status).toBe(200);
  });

  it('não permite o admin bloquear a própria conta (400)', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/status`)
      .set('Authorization', bearer(adminToken))
      .send({ ativo: false });
    expect(res.status).toBe(400);
  });
});
