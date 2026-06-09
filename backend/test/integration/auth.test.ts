import { describe, it, expect } from 'vitest';
import { app, request, registerUser, uniqueEmail, bearer } from '../helpers.js';

describe('Auth (integração)', () => {
  it('registra um novo usuário e retorna token', async () => {
    const email = uniqueEmail('novo');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Quintus', email, senha: 'senha123', tipo: 'comprador' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(email);
  });

  it('rejeita e-mail duplicado com 409', async () => {
    const u = await registerUser('comprador');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Outro', email: u.email, senha: 'senha123', tipo: 'comprador' });
    expect(res.status).toBe(409);
  });

  it('faz login com credenciais válidas', async () => {
    const u = await registerUser('comprador');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: u.email, senha: u.senha });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejeita login com senha errada (401)', async () => {
    const u = await registerUser('comprador');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: u.email, senha: 'errada' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me exige token', async () => {
    const semToken = await request(app).get('/api/auth/me');
    expect(semToken.status).toBe(401);

    const u = await registerUser('comprador');
    const comToken = await request(app).get('/api/auth/me').set('Authorization', bearer(u.token));
    expect(comToken.status).toBe(200);
    expect(comToken.body.email).toBe(u.email);
  });

  it('rejeita dados inválidos no registro (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'x', email: 'nao-email', senha: '123' });
    expect(res.status).toBe(400);
  });
});
