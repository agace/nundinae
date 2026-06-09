import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { http } from '../services/api';
import { useCart } from '../contexts/CartContext';

type Estado = 'verificando' | 'pago' | 'pendente' | 'cancelado' | 'erro';

const MENSAGENS: Record<Exclude<Estado, 'verificando'>, { titulo: string; texto: string; cor: string }> = {
  pago: { titulo: 'Pagamento aprovado', texto: 'Seu pedido foi confirmado. Enviamos um e-mail de confirmação.', cor: 'var(--gold-400)' },
  pendente: { titulo: 'Pagamento pendente', texto: 'O pagamento ainda está sendo processado. Você pode acompanhar em Meus Pedidos.', cor: 'var(--gold-400)' },
  cancelado: { titulo: 'Pagamento não concluído', texto: 'O pagamento foi recusado ou cancelado. Você pode tentar novamente.', cor: '#ef9a9a' },
  erro: { titulo: 'Não foi possível confirmar', texto: 'Houve um problema ao verificar o pagamento. Verifique em Meus Pedidos.', cor: '#ef9a9a' },
};

export function CheckoutReturn() {
  const [params] = useSearchParams();
  const { refresh } = useCart();
  const [estado, setEstado] = useState<Estado>('verificando');
  const ran = useRef(false);

  const pedidoId = params.get('external_reference');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!pedidoId) { setEstado('erro'); return; }

    http.post<{ pedido_id: number; status: string }>(`/orders/${pedidoId}/confirm`)
      .then(async (r) => {
        await refresh();
        setEstado(r.status === 'pago' ? 'pago' : r.status === 'cancelado' ? 'cancelado' : 'pendente');
      })
      .catch(() => setEstado('erro'));
  }, [pedidoId, refresh]);

  return (
    <div className="container" style={{ padding: '5rem 2rem', maxWidth: '560px', textAlign: 'center' }}>
      {estado === 'verificando' ? (
        <>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
          <p className="muted">Confirmando seu pagamento...</p>
        </>
      ) : (
        <div className="card fade-up" style={{ padding: '3rem 2rem' }}>
          <h1 style={{ fontSize: '1.8rem', color: MENSAGENS[estado].cor, marginBottom: '0.75rem' }}>
            {MENSAGENS[estado].titulo}
          </h1>
          <p className="muted" style={{ marginBottom: '2rem' }}>{MENSAGENS[estado].texto}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/pedidos"
              className="btn btn-primary"
              state={pedidoId ? { highlight: Number(pedidoId) } : undefined}
            >
              Ver meus pedidos
            </Link>
            {(estado === 'cancelado' || estado === 'erro') && (
              <Link to="/carrinho" className="btn btn-ghost">Voltar ao carrinho</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
