import { pool } from '../db/pool.js';

export interface NotificationInput {
  tipo: string;
  titulo: string;
  mensagem?: string | null;
  link?: string | null;
}

/**
 * Cria uma notificação in-app para um usuário. Algumas notificações nascem de
 * triggers no banco (avaliação recebida, mudança de status do pedido); esta
 * função cobre os eventos disparados pela aplicação (venda, pergunta, resposta).
 * Nunca derruba o fluxo principal — falhas são apenas registradas.
 */
export async function notify(usuarioId: number, n: NotificationInput): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, n.tipo, n.titulo, n.mensagem ?? null, n.link ?? null],
    );
  } catch (err) {
    console.error('[notif] Falha ao criar notificação:', (err as Error).message);
  }
}
