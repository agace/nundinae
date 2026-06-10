import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Envio de e-mail transacional via SMTP (Nodemailer). Funciona com Gmail
 * (app password) ou Resend (host smtp.resend.com, user "resend", pass = API key),
 * entre outros. Se o SMTP não estiver configurado, o envio é ignorado sem
 * derrubar o fluxo do pedido.
 */

export function isConfigured(): boolean {
  return Boolean(env.email.host && env.email.user && env.email.pass);
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: { user: env.email.user, pass: env.email.pass },
    });
  }
  return transporter;
}

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

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
        <td style="padding:6px 0;color:#3a2128">${i.quantidade}× ${i.produto_nome}</td>
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
      <p style="color:#3a2128">Salve, <strong>${order.nome}</strong>!</p>
      <p style="color:#3a2128">Seu pedido <strong>#${order.pedidoId}</strong> foi confirmado e o pagamento aprovado.</p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;border-top:1px solid #eadfce;border-bottom:1px solid #eadfce">
        ${linhas}
      </table>
      <p style="text-align:right;font-size:18px;color:#7a1f2b"><strong>Total: ${brl(order.total)}</strong></p>
      <p style="color:#8a7a6a;font-size:12px;margin-top:24px">Obrigado por comprar na feira da Nundinae. SPQR.</p>
    </div>
  </div>`;
}

/** Envia o e-mail de confirmação do pedido. Lança erro em caso de falha de SMTP. */
export async function sendOrderConfirmation(order: OrderEmail): Promise<void> {
  if (!isConfigured()) {
    console.warn(`[email] SMTP não configurado — confirmação do pedido #${order.pedidoId} não enviada.`);
    return;
  }
  await getTransporter().sendMail({
    from: env.email.from,
    to: order.to,
    subject: `Nundinae — Confirmação do pedido #${order.pedidoId}`,
    html: renderHtml(order),
  });
  console.log(`[email] Confirmação do pedido #${order.pedidoId} enviada para ${order.to}.`);
}
