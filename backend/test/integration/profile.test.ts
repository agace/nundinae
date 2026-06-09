import { describe, it, expect } from 'vitest';
import { app, request, registerUser, bearer } from '../helpers.js';

describe('Perfil do usuário (integração)', () => {
  it('atualiza nome, telefone, bio e endereço', async () => {
    const u = await registerUser('comprador');

    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', bearer(u.token))
      .send({
        nome: 'Nome Atualizado',
        telefone: '(42) 90000-0000',
        bio: 'Colecionador de antiguidades romanas.',
        endereco_cep: '84010-000',
        endereco_logradouro: 'Rua das Oliveiras',
        endereco_numero: '120',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Ponta Grossa',
        endereco_estado: 'PR',
      });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Nome Atualizado');
    expect(res.body.telefone).toBe('(42) 90000-0000');
    expect(res.body.endereco_cidade).toBe('Ponta Grossa');

    // /auth/me deve refletir as mudanças
    const me = await request(app).get('/api/auth/me').set('Authorization', bearer(u.token));
    expect(me.status).toBe(200);
    expect(me.body.bio).toBe('Colecionador de antiguidades romanas.');
    expect(me.body.endereco_estado).toBe('PR');
  });

  it('rejeita nome muito curto (400)', async () => {
    const u = await registerUser('comprador');
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', bearer(u.token))
      .send({ nome: 'A' });
    expect(res.status).toBe(400);
  });

  it('troca a senha e permite login com a nova', async () => {
    const u = await registerUser('comprador');

    const troca = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', bearer(u.token))
      .send({ senha_atual: u.senha, nova_senha: 'novaSenha456' });
    expect(troca.status).toBe(200);

    // senha antiga não funciona mais
    const loginAntigo = await request(app)
      .post('/api/auth/login')
      .send({ email: u.email, senha: u.senha });
    expect(loginAntigo.status).toBe(401);

    // nova senha funciona
    const loginNovo = await request(app)
      .post('/api/auth/login')
      .send({ email: u.email, senha: 'novaSenha456' });
    expect(loginNovo.status).toBe(200);
  });

  it('rejeita troca de senha com senha atual incorreta (400)', async () => {
    const u = await registerUser('comprador');
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', bearer(u.token))
      .send({ senha_atual: 'errada', nova_senha: 'novaSenha456' });
    expect(res.status).toBe(400);
  });

  it('exige autenticação para editar o perfil (401)', async () => {
    const res = await request(app).put('/api/users/me').send({ nome: 'Qualquer' });
    expect(res.status).toBe(401);
  });
});

describe('Admin gerencia produtos / RF09 (integração)', () => {
  it('lista todos os produtos (inclusive inativos) para o admin', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nundinae.com', senha: 'admin123' });
    const adminToken = login.body.token;

    // cria e desativa um produto
    const vendedor = await registerUser('vendedor');
    const prod = await request(app)
      .post('/api/products')
      .set('Authorization', bearer(vendedor.token))
      .send({ nome: 'Item Admin', descricao: 'x', preco: 50, estoque: 3, categoria: 'Joias' });
    await request(app).delete(`/api/products/${prod.body.id}`).set('Authorization', bearer(vendedor.token));

    const lista = await request(app).get('/api/admin/products').set('Authorization', bearer(adminToken));
    expect(lista.status).toBe(200);
    expect(Array.isArray(lista.body)).toBe(true);
    const inativo = lista.body.find((p: { id: number }) => p.id === prod.body.id);
    expect(inativo).toBeTruthy();
    expect(inativo.ativo).toBe(false);
    expect(inativo.vendedor_nome).toBeTruthy();

    // admin reativa via PUT /products/:id
    const reativa = await request(app)
      .put(`/api/products/${prod.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ ativo: true });
    expect(reativa.status).toBe(200);
    expect(reativa.body.ativo).toBe(true);
  });

  it('nega a listagem de produtos a quem não é admin (403)', async () => {
    const comum = await registerUser('comprador');
    const res = await request(app).get('/api/admin/products').set('Authorization', bearer(comum.token));
    expect(res.status).toBe(403);
  });
});
