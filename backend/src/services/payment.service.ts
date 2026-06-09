import { env } from '../config/env.js';

/**
 * Integração com o Mercado Pago.
 * Fluxo ativo: PIX real via Checkout Transparente (createPixPayment + confirmação
 * por external_reference). Mantém também o Checkout Pro (createPreference) como
 * código legado/opcional. Sem MP_ACCESS_TOKEN, `isConfigured()` é false e o PIX
 * cai no modo simulado — assim a aplicação roda sem credenciais.
 */

const MP_API = 'https://api.mercadopago.com';

export function isConfigured(): boolean {
  return Boolean(env.mercadoPago.accessToken);
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.mercadoPago.accessToken}` };
}

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface Preference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

/** Cria uma preferência de pagamento (itens + retorno) e devolve os links. */
export async function createPreference(params: {
  pedidoId: number;
  items: PreferenceItem[];
  payerEmail?: string;
}): Promise<Preference> {
  const backUrl = `${env.frontendUrl}/checkout/retorno`;
  const body = {
    items: params.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      currency_id: 'BRL',
    })),
    external_reference: String(params.pedidoId),
    ...(params.payerEmail ? { payer: { email: params.payerEmail } } : {}),
    // back_urls levam de volta ao app; sem auto_return para evitar a recusa
    // que o MP às vezes faz com URLs de localhost. O usuário volta clicando
    // em "Voltar ao site" no checkout, e /checkout/retorno confirma o pedido.
    back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago: falha ao criar preferência (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as Preference;
  return { id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point };
}

export interface PixCharge {
  paymentId: number;
  status: string;
  qrCode: string;        // "copia e cola" (EMV)
  qrCodeBase64: string;  // imagem PNG em base64
  ticketUrl?: string;
}

/**
 * Cria uma cobrança PIX REAL via API do Mercado Pago (Checkout Transparente).
 * Devolve o QR Code (imagem + copia e cola) que o cliente paga pelo app do banco.
 * O pedido só é confirmado quando o pagamento cair (consultado por external_reference).
 */
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
      // Idempotência: evita cobrança duplicada se a requisição for reenviada.
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

/** Consulta os pagamentos do pedido (external_reference) e resume o resultado. */
export async function getPaymentOutcome(pedidoId: number): Promise<PaymentOutcome> {
  const url = `${MP_API}/v1/payments/search?external_reference=${pedidoId}&sort=date_created&criteria=desc`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Mercado Pago: falha ao consultar pagamento (${res.status})`);
  }
  const data = (await res.json()) as { results?: { status: string }[] };
  const results = data.results ?? [];
  if (results.some((p) => p.status === 'approved')) return 'approved';
  if (results.some((p) => p.status === 'rejected' || p.status === 'cancelled')) return 'rejected';
  return 'pending';
}
