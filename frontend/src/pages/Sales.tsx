import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { http, ApiError } from '../services/api';
import type { SaleItem, OrderStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { IconTruck } from '../components/Icons';
import { dataHora, money } from '../utils/format';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', pago: 'Pago', preparando: 'Preparando',
  enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
};

// Próxima etapa do rastreamento que o vendedor pode acionar.
const PROXIMO: Record<string, { status: OrderStatus; label: string } | undefined> = {
  pago: { status: 'preparando', label: 'Iniciar preparação' },
  preparando: { status: 'enviado', label: 'Marcar como enviado' },
  enviado: { status: 'entregue', label: 'Marcar como entregue' },
};

function statusBadge(status: string) {
  const cls = (status === 'pago' || status === 'entregue') ? 'badge badge-success' : status === 'cancelado' ? 'badge badge-error' : 'badge badge-gold';
  return <span className={cls}>{STATUS_LABEL[status] ?? status}</span>;
}

export function Sales() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<number | null>(null);

  function load() {
    http.get<SaleItem[]>('/orders/sales')
      .then(setSales)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user && user.tipo === 'comprador') return;
    load();
  }, [user]);

  async function avancar(pedidoId: number, status: OrderStatus, label: string) {
    setAdvancing(pedidoId);
    try {
      await http.patch(`/orders/${pedidoId}/status`, { status });
      toast(`${label}. Comprador notificado.`, 'success');
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao atualizar', 'error');
    } finally {
      setAdvancing(null);
    }
  }

  if (user && user.tipo === 'comprador') {
    return <Navigate to="/catalogo" replace />;
  }

  // Faturamento conta apenas vendas pagas/entregues.
  const pagas = sales.filter((s) => s.status === 'pago' || s.status === 'entregue');
  const faturamento = pagas.reduce((acc, s) => acc + s.subtotal, 0);
  const unidades = pagas.reduce((acc, s) => acc + s.quantidade, 0);

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em', marginBottom: '2rem' }}>
        MINHAS VENDAS
      </h1>

      {!loading && sales.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <SummaryCard label="Faturamento (pago)" value={`${money(faturamento)}`} />
          <SummaryCard label="Unidades vendidas" value={String(unidades)} />
          <SummaryCard label="Total de registros" value={String(sales.length)} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : sales.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p className="muted">Você ainda não realizou vendas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sales.map((s, idx) => (
            <div key={`${s.pedido_id}-${s.produto_id}-${idx}`} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '8px', flexShrink: 0,
                background: s.produto_imagem ? `url(${s.produto_imagem}) center/cover` : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
              }} />
              <div style={{ flex: 1, minWidth: '180px' }}>
                <p style={{ fontWeight: 600 }}>{s.quantidade}× {s.produto_nome}</p>
                <p className="muted" style={{ fontSize: '0.78rem' }}>
                  Comprador: {s.comprador_nome} · Pedido #{s.pedido_id}
                </p>
                <p className="muted" style={{ fontSize: '0.75rem' }}>
                  {dataHora(s.created_at)}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                {statusBadge(s.status)}
                <strong className="gold" style={{ fontSize: '1.1rem' }}>
                  {money(s.subtotal)}
                </strong>
                {PROXIMO[s.status] && (
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.72rem', gap: '0.4rem' }}
                    disabled={advancing === s.pedido_id}
                    onClick={() => avancar(s.pedido_id, PROXIMO[s.status]!.status, PROXIMO[s.status]!.label)}
                  >
                    <IconTruck size={13} />
                    {advancing === s.pedido_id ? '...' : PROXIMO[s.status]!.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
      <div className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div className="gold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, marginTop: '0.3rem' }}>{value}</div>
    </div>
  );
}
