import { useEffect, useState } from 'react';
import { http } from '../services/api';
import type { Tracking, OrderStatus } from '../types';
import { IconTruck } from './Icons';
import { dataHora } from '../utils/format';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: 'Aguardando pagamento',
  pago: 'Pagamento aprovado',
  preparando: 'Em preparação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// Os eventos da timeline são gerados por trigger no banco.
export function OrderTracking({ pedidoId }: { pedidoId: number }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http.get<Tracking>(`/orders/${pedidoId}/tracking`)
      .then(setTracking)
      .catch(() => setTracking(null))
      .finally(() => setLoading(false));
  }, [pedidoId]);

  if (loading) return <div style={{ display: 'grid', placeItems: 'center', padding: '1.5rem' }}><div className="spinner" /></div>;
  if (!tracking || tracking.eventos.length === 0) {
    return <p className="muted" style={{ fontSize: '0.85rem' }}>Sem eventos de rastreamento.</p>;
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--gold-400)' }}>
        <IconTruck size={18} />
        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          Rastreamento · {STATUS_LABEL[tracking.status]}
        </span>
      </div>

      <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
        {/* Linha vertical */}
        <div style={{ position: 'absolute', left: '6px', top: '6px', bottom: '6px', width: '2px', background: 'var(--border-subtle)' }} />
        {tracking.eventos.map((e, idx) => {
          const ultimo = idx === tracking.eventos.length - 1;
          return (
            <div key={idx} style={{ position: 'relative', paddingBottom: idx === tracking.eventos.length - 1 ? 0 : '1.1rem' }}>
              <span style={{
                position: 'absolute', left: '-1.5rem', top: '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: ultimo ? 'var(--gold-500)' : 'var(--wine-400)',
                border: '2px solid var(--bg-main)',
                boxShadow: ultimo ? '0 0 0 3px rgba(212,164,58,0.25)' : 'none',
              }} />
              <p style={{ fontSize: '0.88rem', fontWeight: ultimo ? 600 : 400, color: ultimo ? 'var(--cream-100)' : 'var(--cream-200)' }}>
                {e.descricao}
              </p>
              <p className="muted" style={{ fontSize: '0.72rem' }}>
                {dataHora(e.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
