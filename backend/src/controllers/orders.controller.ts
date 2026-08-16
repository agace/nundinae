import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { parseId } from '../utils/params.js';
import * as paymentService from '../services/payment.service.js';
import * as emailService from '../services/email.service.js';
import { notify } from '../services/notifications.service.js';
import { validateCoupon } from './coupons.controller.js';
import type { RowDataPacket } from 'mysql2';

const enderecoSchema = z
  .object({
    cep: z.string().max(9).optional().nullable(),
    logradouro: z.string().max(150).optional().nullable(),
    numero: z.string().max(20).optional().nullable(),
    complemento: z.string().max(100).optional().nullable(),
    bairro: z.string().max(100).optional().nullable(),
    cidade: z.string().max(100).optional().nullable(),
    estado: z.string().max(2).optional().nullable(),
  })
  .optional();

const checkoutSchema = z.object({
  metodo: z.enum(['cartao', 'pix', 'boleto']),
  simular_falha: z.boolean().optional().default(false),
  endereco: enderecoSchema,
  cupom: z.string().max(40).optional().nullable(),
  // CPF do pagador (só usado no PIX real do Mercado Pago).
  cpf: z.string().max(14).optional().nullable(),
});

// Revalida o cupom no servidor: o desconto enviado pelo cliente nunca é aceito.
async function resolverCupom(cupom: string | null | undefined, userId: number): Promise<{ codigo: string | null; desconto: number }> {
  if (!cupom || !cupom.trim()) return { codigo: null, desconto: 0 };
  const r = await validateCoupon(cupom, userId);
  return { codigo: r.codigo, desconto: r.desconto };
}

async function notificarVendedores(pedidoId: number): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ip.vendedor_id, GROUP_CONCAT(p.nome SEPARATOR ', ') AS produtos
       FROM itens_pedido ip JOIN produtos p ON p.id = ip.produto_id
      WHERE ip.pedido_id = ?
      GROUP BY ip.vendedor_id`,
    [pedidoId],
  );
  for (const r of rows) {
    await notify(r.vendedor_id, {
      tipo: 'venda',
      titulo: 'Você fez uma venda',
      mensagem: `Pedido #${pedidoId}: ${r.produtos}`,
      link: '/vendas',
    });
  }
}

type EnderecoEntrega = z.infer<typeof enderecoSchema>;

async function salvarEnderecoEntrega(pedidoId: number, e: EnderecoEntrega): Promise<void> {
  if (!e) return;
  await pool.query(
    `UPDATE pedidos SET
       entrega_cep = ?, entrega_logradouro = ?, entrega_numero = ?, entrega_complemento = ?,
       entrega_bairro = ?, entrega_cidade = ?, entrega_estado = ?
     WHERE id = ?`,
    [
      e.cep ?? null, e.logradouro ?? null, e.numero ?? null, e.complemento ?? null,
      e.bairro ?? null, e.cidade ?? null, e.estado ?? null, pedidoId,
    ],
  );
}

// Uma falha no envio não pode derrubar um pedido já pago.
async function enviarEmailPedido(pedidoId: number, userId: number): Promise<void> {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT nome, email FROM usuarios WHERE id = ?',
      [userId],
    );
    const usuario = users[0];
    if (!usuario) return;

    const [pedidos] = await pool.query<RowDataPacket[]>(
      'SELECT total FROM pedidos WHERE id = ?',
      [pedidoId],
    );
    const [itens] = await pool.query<RowDataPacket[]>(
      `SELECT p.nome AS produto_nome, ip.quantidade, ip.preco_unitario
         FROM itens_pedido ip JOIN produtos p ON p.id = ip.produto_id
        WHERE ip.pedido_id = ?`,
      [pedidoId],
    );

    await emailService.sendOrderConfirmation({
      to: usuario.email,
      nome: usuario.nome,
      pedidoId,
      total: Number(pedidos[0]?.total ?? 0),
      itens: itens.map((i) => ({
        produto_nome: i.produto_nome,
        quantidade: i.quantidade,
        preco_unitario: Number(i.preco_unitario),
      })),
    });
  } catch (err) {
    console.error(`[email] Falha ao enviar confirmação do pedido #${pedidoId}:`, (err as Error).message);
  }
}

export function paymentMode(_req: Request, res: Response): void {
  res.json({ mercadopago: paymentService.isConfigured() });
}

export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = checkoutSchema.parse(req.body);
    const userId = req.user!.sub;

    // Cupom revalidado no servidor sobre o carrinho real (escopo do dono do cupom).
    const { codigo: cupomCodigo, desconto } = await resolverCupom(data.cupom, userId);

    // PIX real: o pedido nasce 'pendente' e só é confirmado quando o pagamento
    // cair, checado em POST /orders/:id/confirm por external_reference.
    if (data.metodo === 'pix' && paymentService.isConfigured()) {
      const [rs] = await pool.query<RowDataPacket[][]>(
        'CALL sp_criar_pedido_pendente(?, ?, ?, ?)',
        [userId, 'pix', cupomCodigo, desconto],
      );
      const row = rs[0]?.[0];
      if (!row) throw new HttpError(500, 'Falha ao criar o pedido');
      const pedidoId = Number(row.pedido_id);
      await salvarEnderecoEntrega(pedidoId, data.endereco);

      const [users] = await pool.query<RowDataPacket[]>(
        'SELECT nome, email FROM usuarios WHERE id = ?',
        [userId],
      );
      const u = users[0];
      const partes = String(u?.nome ?? 'Cliente Nundinae').trim().split(/\s+/);
      const charge = await paymentService.createPixPayment({
        pedidoId,
        amount: Number(row.total),
        payer: {
          email: u?.email,
          firstName: partes[0],
          lastName: partes.slice(1).join(' ') || partes[0],
          cpf: data.cpf ? data.cpf.replace(/\D/g, '') : undefined,
        },
      });

      res.status(201).json({
        pedido_id: pedidoId,
        status: 'pendente',
        payment_required: true,
        metodo: 'pix',
        total: Number(row.total),
        desconto: Number(row.desconto ?? 0),
        pix: {
          qr_code: charge.qrCode,
          qr_code_base64: charge.qrCodeBase64,
          ticket_url: charge.ticketUrl,
        },
      });
      return;
    }

    // Cartão/boleto (e PIX sem credenciais): sp_checkout valida carrinho e
    // estoque, cria pedido + pagamento, e o trigger RN004 baixa o estoque.
    const [resultSets] = await pool.query<RowDataPacket[][]>(
      'CALL sp_checkout(?, ?, ?, ?, ?)',
      [userId, data.metodo, data.simular_falha ? 1 : 0, cupomCodigo, desconto],
    );
    const row = resultSets[0]?.[0];
    if (!row) throw new HttpError(500, 'Falha ao processar o checkout');

    await salvarEnderecoEntrega(Number(row.pedido_id), data.endereco);

    if (row.pagamento === 'aprovado') {
      const pedidoId = Number(row.pedido_id);
      await enviarEmailPedido(pedidoId, userId);
      // Notifica o comprador (o pedido nasce 'pago' por INSERT, sem UPDATE, então
      // o trigger de status não dispara) e os vendedores da venda.
      await notify(userId, {
        tipo: 'pedido',
        titulo: `Pedido #${pedidoId} confirmado`,
        mensagem: 'Seu pagamento foi aprovado. Acompanhe o rastreamento.',
        link: '/pedidos',
      });
      await notificarVendedores(pedidoId);
    }

    res.status(201).json({
      pedido_id: Number(row.pedido_id),
      status: row.status,
      pagamento: row.pagamento,
      payment_required: false,
      total: Number(row.total),
      desconto: Number(row.desconto ?? 0),
      metodo: row.metodo,
    });
  } catch (err) {
    next(err);
  }
}

// Consulta o status real do pagamento no Mercado Pago e resolve o pedido.
export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const pedidoId = parseId(req.params.id, 'Pedido');

    const [orders] = await pool.query<RowDataPacket[]>(
      'SELECT id, usuario_id, status FROM pedidos WHERE id = ?',
      [pedidoId],
    );
    const pedido = orders[0];
    if (!pedido) throw new HttpError(404, 'Pedido não encontrado');
    if (pedido.usuario_id !== userId) throw new HttpError(403, 'Pedido não pertence ao usuário');

    // Já resolvido ou sem gateway configurado: devolve o estado atual.
    if (!paymentService.isConfigured() || pedido.status === 'pago' || pedido.status === 'cancelado') {
      res.json({ pedido_id: pedidoId, status: pedido.status });
      return;
    }

    const outcome = await paymentService.getPaymentOutcome(pedidoId);
    if (outcome === 'pending') {
      res.json({ pedido_id: pedidoId, status: 'pendente' });
      return;
    }

    const aprovado = outcome === 'approved';
    await pool.query('CALL sp_confirmar_pagamento(?, ?)', [pedidoId, aprovado ? 1 : 0]);
    if (aprovado) {
      await enviarEmailPedido(pedidoId, userId);
      // O comprador é notificado pelo trigger de mudança de status (pendente→pago).
      await notificarVendedores(pedidoId);
    }

    res.json({ pedido_id: pedidoId, status: aprovado ? 'pago' : 'cancelado' });
  } catch (err) {
    next(err);
  }
}

export async function listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ip.pedido_id, p.status, p.created_at, comp.nome AS comprador_nome,
              ip.produto_id, pr.nome AS produto_nome, pr.imagem AS produto_imagem,
              ip.quantidade, ip.preco_unitario
         FROM itens_pedido ip
         JOIN pedidos p ON p.id = ip.pedido_id
         JOIN produtos pr ON pr.id = ip.produto_id
         JOIN usuarios comp ON comp.id = p.usuario_id
        WHERE ip.vendedor_id = ?
        ORDER BY p.created_at DESC`,
      [userId],
    );
    res.json(
      rows.map((r) => ({
        pedido_id: r.pedido_id,
        status: r.status,
        created_at: r.created_at,
        comprador_nome: r.comprador_nome,
        produto_id: r.produto_id,
        produto_nome: r.produto_nome,
        produto_imagem: r.produto_imagem,
        quantidade: r.quantidade,
        preco_unitario: Number(r.preco_unitario),
        subtotal: Number(r.preco_unitario) * r.quantidade,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.total, p.status, p.created_at, p.cupom_codigo, p.desconto,
              pg.metodo, pg.status AS pagamento_status
         FROM pedidos p
         LEFT JOIN pagamentos pg ON pg.pedido_id = p.id
        WHERE p.usuario_id = ?
        ORDER BY p.created_at DESC`,
      [userId],
    );
    const ids = orders.map((o) => o.id);
    let itensByOrder: Record<number, RowDataPacket[]> = {};
    if (ids.length > 0) {
      const [itens] = await pool.query<RowDataPacket[]>(
        `SELECT ip.pedido_id, ip.produto_id, ip.vendedor_id, ip.quantidade, ip.preco_unitario,
                p.nome AS produto_nome, p.imagem AS produto_imagem, u.nome AS vendedor_nome
           FROM itens_pedido ip
           JOIN produtos p ON p.id = ip.produto_id
           JOIN usuarios u ON u.id = ip.vendedor_id
          WHERE ip.pedido_id IN (?)`,
        [ids],
      );
      itensByOrder = itens.reduce((acc, it) => {
        (acc[it.pedido_id] ||= []).push(it);
        return acc;
      }, {} as Record<number, RowDataPacket[]>);
    }

    res.json(
      orders.map((o) => ({
        id: o.id,
        total: Number(o.total),
        status: o.status,
        created_at: o.created_at,
        metodo: o.metodo,
        pagamento_status: o.pagamento_status,
        cupom_codigo: o.cupom_codigo,
        desconto: Number(o.desconto ?? 0),
        itens: (itensByOrder[o.id] ?? []).map((it) => ({
          produto_id: it.produto_id,
          produto_nome: it.produto_nome,
          produto_imagem: it.produto_imagem,
          vendedor_id: it.vendedor_id,
          vendedor_nome: it.vendedor_nome,
          quantidade: it.quantidade,
          preco_unitario: Number(it.preco_unitario),
        })),
      })),
    );
  } catch (err) {
    next(err);
  }
}

// Próximo status permitido a partir do atual, avançado pelo vendedor.
const PROXIMO_STATUS: Record<string, string> = {
  pago: 'preparando',
  preparando: 'enviado',
  enviado: 'entregue',
};

// Timeline do pedido, visível ao comprador, a um vendedor participante ou ao
// admin. Os eventos são gerados por trigger no banco.
export async function tracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const pedidoId = parseId(req.params.id, 'Pedido');

    const [orders] = await pool.query<RowDataPacket[]>(
      'SELECT id, usuario_id, status FROM pedidos WHERE id = ?',
      [pedidoId],
    );
    const pedido = orders[0];
    if (!pedido) throw new HttpError(404, 'Pedido não encontrado');

    const [participa] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM itens_pedido WHERE pedido_id = ? AND vendedor_id = ? LIMIT 1',
      [pedidoId, userId],
    );
    const podeVer = pedido.usuario_id === userId || participa.length > 0 || req.user!.tipo === 'admin';
    if (!podeVer) throw new HttpError(403, 'Você não tem acesso a este pedido');

    const [eventos] = await pool.query<RowDataPacket[]>(
      'SELECT status, descricao, created_at FROM pedido_eventos WHERE pedido_id = ? ORDER BY id ASC',
      [pedidoId],
    );
    res.json({
      pedido_id: pedidoId,
      status: pedido.status,
      proximo_status: PROXIMO_STATUS[pedido.status] ?? null,
      eventos: eventos.map((e) => ({ status: e.status, descricao: e.descricao, created_at: e.created_at })),
    });
  } catch (err) {
    next(err);
  }
}

const advanceSchema = z.object({
  status: z.enum(['preparando', 'enviado', 'entregue']),
});

// A timeline e a notificação ao comprador saem de trigger no banco.
export async function advanceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const pedidoId = parseId(req.params.id, 'Pedido');
    const { status } = advanceSchema.parse(req.body);

    const [orders] = await pool.query<RowDataPacket[]>(
      'SELECT status FROM pedidos WHERE id = ?',
      [pedidoId],
    );
    const pedido = orders[0];
    if (!pedido) throw new HttpError(404, 'Pedido não encontrado');

    const [participa] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM itens_pedido WHERE pedido_id = ? AND vendedor_id = ? LIMIT 1',
      [pedidoId, userId],
    );
    if (participa.length === 0 && req.user!.tipo !== 'admin') {
      throw new HttpError(403, 'Apenas o vendedor do pedido pode atualizar o rastreamento');
    }

    if (PROXIMO_STATUS[pedido.status] !== status) {
      throw new HttpError(400, `Transição inválida: ${pedido.status} → ${status}`);
    }

    await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, pedidoId]);
    res.json({ pedido_id: pedidoId, status });
  } catch (err) {
    next(err);
  }
}
