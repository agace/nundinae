import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { http, ApiError } from '../services/api';
import type { Order } from '../types';
import { StarRating } from '../components/StarRating';
import { IconCheck, IconTruck } from '../components/Icons';
import { OrderTracking } from '../components/OrderTracking';
import { useToast } from '../contexts/ToastContext';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', pago: 'Pago', preparando: 'Preparando',
  enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
};

function statusBadgeClass(status: string) {
  if (status === 'pago' || status === 'entregue') return 'badge badge-success';
  if (status === 'cancelado') return 'badge badge-error';
  return 'badge badge-gold';
}

export function Orders() {
  const loc = useLocation();
  const highlight = (loc.state as { highlight?: number } | null)?.highlight;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<{ pedidoId: number; vendedorId: number; nome: string } | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      let data = await http.get<Order[]>('/orders/mine');
      // Reconcilia pedidos pendentes: consulta o status real no Mercado Pago.
      // Cobre o caso de o usuário não voltar pelo botão "Voltar ao site" do MP.
      const pendentes = data.filter((o) => o.status === 'pendente');
      if (pendentes.length > 0) {
        await Promise.all(
          pendentes.map((o) =>
            http.post(`/orders/${o.id}/confirm`).catch(() => undefined),
          ),
        );
        data = await http.get<Order[]>('/orders/mine');
      }
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  function statusBadge(status: string) {
    return <span className={statusBadgeClass(status)}>{STATUS_LABEL[status] ?? status}</span>;
  }

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em', marginBottom: '2rem' }}>
        MEUS PEDIDOS
      </h1>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p className="muted">Você ainda não tem pedidos.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((o) => {
            const isHighlight = highlight === o.id;
            const vendedoresUnicos = Array.from(
              new Map(o.itens.map((i) => [i.vendedor_id, i])).values(),
            );
            return (
              <div
                key={o.id}
                className="card fade-up"
                style={{
                  padding: '1.75rem',
                  border: isHighlight ? '1.5px solid var(--gold-500)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p className="muted" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Pedido #{o.id}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {new Date(o.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {statusBadge(o.status)}
                    <span className="muted" style={{ fontSize: '0.8rem' }}>via {o.metodo}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {o.itens.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '8px', flexShrink: 0,
                        background: it.produto_imagem ? `url(${it.produto_imagem}) center/cover` : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
                      }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.9rem' }}>{it.quantidade}× {it.produto_nome}</p>
                        <p className="muted" style={{ fontSize: '0.75rem' }}>por {it.vendedor_nome}</p>
                      </div>
                      <p className="gold" style={{ fontWeight: 600 }}>R$ {(it.preco_unitario * it.quantidade).toFixed(2).replace('.', ',')}</p>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    {o.desconto > 0 && (
                      <p className="muted" style={{ fontSize: '0.78rem' }}>
                        Cupom {o.cupom_codigo} · desconto de R$ {o.desconto.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <strong className="gold" style={{ fontSize: '1.2rem' }}>
                      Total R$ {o.total.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {o.status !== 'pendente' && o.status !== 'cancelado' && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem' }}
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      >
                        <IconTruck size={14} />
                        {expanded === o.id ? 'Ocultar rastreamento' : 'Rastrear pedido'}
                      </button>
                    )}
                    {(o.status === 'pago' || o.status === 'entregue') && vendedoresUnicos.map((v) => {
                      const key = `${o.id}-${v.vendedor_id}`;
                      const already = reviewed.has(key);
                      return (
                        <button
                          key={v.vendedor_id}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem' }}
                          disabled={already}
                          onClick={() => setReviewing({ pedidoId: o.id, vendedorId: v.vendedor_id, nome: v.vendedor_nome })}
                        >
                          {already && <IconCheck size={12} />}
                          {already ? 'Avaliado' : `Avaliar ${v.vendedor_nome.split(' ')[0]}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {expanded === o.id && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '1rem', paddingTop: '1rem' }}>
                    <OrderTracking pedidoId={o.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          {...reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewed((s) => new Set(s).add(`${reviewing.pedidoId}-${reviewing.vendedorId}`));
            setReviewing(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({
  pedidoId, vendedorId, nome, onClose, onDone,
}: { pedidoId: number; vendedorId: number; nome: string; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await http.post('/reviews', {
        pedido_id: pedidoId, vendedor_id: vendedorId, nota, comentario,
      });
      toast('Avaliação enviada. Obrigado.', 'success');
      onDone();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao avaliar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'grid', placeItems: 'center',
      padding: '2rem', zIndex: 50,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card fade-up" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Avaliar {nome}</h2>
        <p className="muted mb-3" style={{ fontSize: '0.85rem' }}>Ajude outros compradores com sua experiência</p>

        <div className="field">
          <label className="label">Nota</label>
          <StarRating value={nota} onChange={setNota} size={32} />
        </div>
        <div className="field">
          <label className="label">Comentário (opcional)</label>
          <textarea
            className="input"
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte como foi a experiência..."
            style={{ resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
}
