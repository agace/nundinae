import { env } from '../config/env.js';

// E-mail transacional pela API HTTP do Resend em vez de SMTP: a porta 443 não
// costuma vir bloqueada nas redes onde o projeto é apresentado. Sem a API key,
// o envio é ignorado sem derrubar o fluxo do pedido.

const RESEND_API = 'https://api.resend.com/emails';

export function isConfigured(): boolean {
  return Boolean(env.email.apiKey);
}

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

// Nome do comprador e nome do produto são texto livre de outros usuários:
// precisam ser escapados antes de entrar no HTML do e-mail.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OrderEmail {
  to: string;
  nome: string;
  pedidoId: number;
  total: number;
  itens: { produto_nome: string; quantidade: number; preco_unitario: number }[];
}

function renderHtml(order: OrderEmail): string {
  const linhas = order.itens
    .map(
      (i) => `<tr>
        <td style="padding:6px 0;color:#3a2128">${i.quantidade}× ${escapeHtml(i.produto_nome)}</td>
        <td style="padding:6px 0;text-align:right;color:#3a2128">${brl(i.preco_unitario * i.quantidade)}</td>
      </tr>`,
    )
    .join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #eadfce;border-radius:12px;overflow:hidden">
    <div style="background:#2a0811;padding:24px 28px">
      <h1 style="margin:0;font-size:22px;letter-spacing:3px;color:#f5ead3;font-weight:bold">NUNDINAE</h1>
      <p style="margin:6px 0 0;color:#e0b54a;font-size:13px">Confirmação de pedido</p>
    </div>
    <div style="padding:28px">
      <p style="color:#3a2128">Salve, <strong>${escapeHtml(order.nome)}</strong>!</p>
      <p style="color:#3a2128">Seu pedido <strong>#${order.pedidoId}</strong> foi confirmado e o pagamento aprovado.</p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;border-top:1px solid #eadfce;border-bottom:1px solid #eadfce">
        ${linhas}
      </table>
      <p style="text-align:right;font-size:18px;color:#7a1f2b"><strong>Total: ${brl(order.total)}</strong></p>
      <p style="color:#8a7a6a;font-size:12px;margin-top:24px">Obrigado por comprar na feira da Nundinae. SPQR.</p>
    </div>
  </div>`;
}

export async function sendOrderConfirmation(order: OrderEmail): Promise<void> {
  if (!isConfigured()) {
    console.warn(`[email] Resend não configurado — confirmação do pedido #${order.pedidoId} não enviada.`);
    return;
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.email.apiKey}`,
    },
    body: JSON.stringify({
      from: env.email.from,
      to: order.to,
      subject: `Nundinae — Confirmação do pedido #${order.pedidoId}`,
      html: renderHtml(order),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend: falha ao enviar e-mail (${res.status}): ${await res.text()}`);
  }
  console.log(`[email] Confirmação do pedido #${order.pedidoId} enviada para ${order.to}.`);
}
