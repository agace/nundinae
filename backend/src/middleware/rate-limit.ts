import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Limitador de requisições em memória. Suficiente para uma instância única, que
 * é o cenário de deploy do projeto. Num cluster com várias réplicas cada uma
 * teria seu próprio contador e o limite efetivo seria multiplicado.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = 'Muitas tentativas. Aguarde alguns minutos.' } = options;
  const buckets = new Map<string, Bucket>();

  // A suíte de integração cria dezenas de contas a partir do mesmo IP.
  if (env.nodeEnv === 'test') {
    return function disabled(_req: Request, _res: Response, next: NextFunction): void {
      next();
    };
  }

  function sweep(now: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function limiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    if (buckets.size > 5000) sweep(now);

    const key = req.ip ?? 'desconhecido';
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}
