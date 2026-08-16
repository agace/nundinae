import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';

export type UserTipo = 'comprador' | 'vendedor' | 'ambos' | 'admin';

export interface AuthPayload {
  sub: number;
  email: string;
  tipo: UserTipo;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'] });
}

/**
 * Valida o token e recarrega papel/status do banco a cada requisição. Sem isso,
 * bloquear ou rebaixar um usuário só teria efeito quando o token dele expirasse
 * (7 dias), já que o `tipo` viaja assinado dentro do JWT.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  let decoded: AuthPayload;
  try {
    decoded = jwt.verify(header.slice(7), env.jwt.secret) as unknown as AuthPayload;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT tipo, ativo FROM usuarios WHERE id = ?',
      [decoded.sub],
    );
    const conta = rows[0];
    if (!conta) {
      res.status(401).json({ error: 'Sessão inválida' });
      return;
    }
    if (!conta.ativo) {
      res.status(403).json({ error: 'Conta bloqueada. Procure o administrador.' });
      return;
    }

    req.user = { sub: decoded.sub, email: decoded.email, tipo: conta.tipo as UserTipo };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.tipo !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito ao administrador' });
    return;
  }
  next();
}

export function requireSeller(req: Request, res: Response, next: NextFunction): void {
  const tipo = req.user?.tipo;
  if (tipo !== 'vendedor' && tipo !== 'ambos' && tipo !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito a vendedores' });
    return;
  }
  next();
}
