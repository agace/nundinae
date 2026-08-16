/** Data e hora no formato pt-BR, sem segundos (dd/mm/aaaa hh:mm). */
export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Valor em reais: 289.9 vira "R$ 289,90". */
export function money(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}
