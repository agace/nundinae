import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signToken } from '../../src/middleware/auth.js';
import { env } from '../../src/config/env.js';

describe('middleware/auth — token (unitário)', () => {
  it('assina um JWT válido que preserva o payload', () => {
    const token = signToken({ sub: 7, email: 'a@b.com', tipo: 'vendedor' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = jwt.verify(token, env.jwt.secret) as { sub: number; email: string; tipo: string };
    expect(payload.sub).toBe(7);
    expect(payload.email).toBe('a@b.com');
    expect(payload.tipo).toBe('vendedor');
  });

  it('um token assinado com outro segredo não é aceito', () => {
    const token = jwt.sign({ sub: 1 }, 'segredo-errado');
    expect(() => jwt.verify(token, env.jwt.secret)).toThrow();
  });
});

describe('bcrypt — hash de senha (unitário)', () => {
  it('gera hash diferente da senha e valida corretamente', async () => {
    const senha = 'roma123';
    const hash = await bcrypt.hash(senha, 10);
    expect(hash).not.toBe(senha);
    expect(await bcrypt.compare(senha, hash)).toBe(true);
    expect(await bcrypt.compare('errada', hash)).toBe(false);
  });
});
