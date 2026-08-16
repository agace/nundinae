import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface MysqlError {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

// As regras de negócio vivem no banco: aqui só traduzimos o que ele recusou
// para uma resposta HTTP.
function mapMysqlError(err: MysqlError): { status: number; message: string } | null {
  switch (err.errno) {
    // SIGNAL SQLSTATE '45000' disparado pelas triggers (RN003, RN004, RN005...)
    case 1644:
      return { status: 400, message: err.sqlMessage ?? 'Operação não permitida' };
    // CHECK constraint violada (RN006: nota entre 1 e 5)
    case 3819:
      return { status: 400, message: 'Valor fora do permitido (verifique a nota: 1 a 5)' };
    // Entrada duplicada (UNIQUE) — ex.: avaliar o mesmo vendedor no mesmo pedido
    case 1062:
      return { status: 409, message: 'Registro duplicado' };
    // Falha de chave estrangeira — referência inexistente
    case 1452:
      return { status: 400, message: 'Referência inválida' };
    default:
      return null;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Dados inválidos', details: err.flatten() });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'MulterError') {
    const code = (err as { code?: string }).code;
    const message = code === 'LIMIT_FILE_SIZE'
      ? 'Imagem muito grande (máximo 3MB)'
      : 'Falha no upload da imagem';
    res.status(400).json({ error: message });
    return;
  }
  if (err && typeof err === 'object' && 'errno' in err) {
    const mapped = mapMysqlError(err as MysqlError);
    if (mapped) {
      res.status(mapped.status).json({ error: mapped.message });
      return;
    }
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
