import { HttpError } from '../middleware/error.js';

/**
 * Converte um parâmetro de rota em id numérico. Sem isso, `/produtos/abc` vira
 * NaN e chega até a query como um filtro que nunca casa, devolvendo 404 por
 * acidente em vez de sinalizar a requisição malformada.
 */
export function parseId(value: string | undefined, label = 'Identificador'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} inválido`);
  }
  return id;
}
