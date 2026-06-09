import request from 'supertest';
import { app } from '../src/app.js';

type Tipo = 'comprador' | 'vendedor' | 'ambos' | 'admin';

export { app, request };

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@test.com`;
}

export interface RegisteredUser {
  token: string;
  user: { id: number; nome: string; email: string; tipo: Tipo };
  email: string;
  senha: string;
}

/** Registra um usuário via API e devolve token + dados. */
export async function registerUser(
  tipo: Tipo = 'ambos',
  overrides: { nome?: string; email?: string; senha?: string } = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? uniqueEmail(tipo);
  const senha = overrides.senha ?? 'senha123';
  const res = await request(app)
    .post('/api/auth/register')
    .send({ nome: overrides.nome ?? 'Usuário Teste', email, senha, tipo });
  if (res.status !== 201) {
    throw new Error(`Falha ao registrar usuário: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, email, senha };
}

/** Cria um produto via API como o vendedor informado. */
export async function createProduct(
  token: string,
  overrides: Partial<{ nome: string; preco: number; estoque: number; categoria: string }> = {},
): Promise<{ id: number; preco: number; estoque: number; vendedor_id: number }> {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nome: overrides.nome ?? 'Produto Teste',
      descricao: 'Item de teste',
      preco: overrides.preco ?? 100,
      estoque: overrides.estoque ?? 5,
      categoria: overrides.categoria ?? 'Joias',
    });
  if (res.status !== 201) {
    throw new Error(`Falha ao criar produto: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export const bearer = (token: string) => `Bearer ${token}`;
