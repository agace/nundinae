import { env } from '../config/env.js';

// PIX real via Checkout Transparente do Mercado Pago. Sem MP_ACCESS_TOKEN,
// isConfigured() é false e o checkout cai no modo simulado, então a aplicação
// roda por completo sem credenciais.

const MP_API = 'https://api.mercadopago.com';

export function isConfigured(): boolean {
  return Boolean(env.mercadoPago.accessToken);
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.mercadoPago.accessToken}` };
}

export interface PixCharge {
  paymentId: number;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
}

export async function createPixPayment(params: {
  pedidoId: number;
  amount: number;
  payer: { email: string; firstName?: string; lastName?: string; cpf?: string };
}): Promise<PixCharge> {
  const body: Record<string, unknown> = {
    transaction_amount: Number(params.amount.toFixed(2)),
    description: `Pedido #${params.pedidoId} - Nundinae`,
    payment_method_id: 'pix',
    external_reference: String(params.pedidoId),
    payer: {
      email: params.payer.email,
      first_name: params.payer.firstName,
      last_name: params.payer.lastName,
      ...(params.payer.cpf ? { identification: { type: 'CPF', number: params.payer.cpf } } : {}),
    },
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Evita cobrança duplicada se a requisição for reenviada.
      'X-Idempotency-Key': `pix-${params.pedidoId}-${Date.now()}`,
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    id?: number; status?: string; message?: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  };
  if (!res.ok) {
    throw new Error(`Mercado Pago: falha ao criar PIX (${res.status}): ${data?.message ?? JSON.stringify(data)}`);
  }
  const tx = data.point_of_interaction?.transaction_data ?? {};
  return {
    paymentId: Number(data.id),
    status: String(data.status),
    qrCode: tx.qr_code ?? '',
    qrCodeBase64: tx.qr_code_base64 ?? '',
    ticketUrl: tx.ticket_url,
  };
}

export type PaymentOutcome = 'approved' | 'rejected' | 'pending';

// Considera apenas o pagamento mais recente da referência: o external_reference
// é o id do pedido, que se repete entre recriações do banco (re-seed) e
// colidiria com cobranças antigas já aprovadas no Mercado Pago.
export async function getPaymentOutcome(pedidoId: number): Promise<PaymentOutcome> {
  const url = `${MP_API}/v1/payments/search?external_reference=${pedidoId}&sort=date_created&criteria=desc`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Mercado Pago: falha ao consultar pagamento (${res.status})`);
  }
  const data = (await res.json()) as { results?: { status: string; date_created: string }[] };
  const results = [...(data.results ?? [])].sort(
    (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
  );
  const atual = results[0];
  if (!atual) return 'pending';
  if (atual.status === 'approved') return 'approved';
  if (atual.status === 'rejected' || atual.status === 'cancelled') return 'rejected';
  return 'pending';
}
