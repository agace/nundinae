import { pool } from '../db/pool.js';

export interface NotificationInput {
  tipo: string;
  titulo: string;
  mensagem?: string | null;
  link?: string | null;
}

// Cobre os eventos disparados pela aplicação (venda, pergunta, resposta). Os
// demais nascem de triggers no banco. Falhar aqui nunca derruba o fluxo.
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
