import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../services/api';
import type { NotificationFeed } from '../types';
import { IconBell } from './Icons';

const POLL_MS = 30000;

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export function NotificationBell() {
  const nav = useNavigate();
  const [feed, setFeed] = useState<NotificationFeed>({ nao_lidas: 0, items: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    http.get<NotificationFeed>('/notifications').then(setFeed).catch(() => undefined);
  }, []);

  // Carrega ao montar e em intervalo regular (poll).
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function abrir(item: NotificationFeed['items'][number]) {
    setOpen(false);
    if (!item.lida) {
      await http.put(`/notifications/${item.id}/read`).catch(() => undefined);
      load();
    }
    if (item.link) nav(item.link);
  }

  async function marcarTodas() {
    await http.put('/notifications/read-all').catch(() => undefined);
    load();
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="nav-user-chip"
        aria-label="Notificações"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '2.6rem', height: '2.6rem', padding: 0,
          border: '1px solid var(--border-subtle)', borderRadius: '50%',
          color: 'var(--cream-100)', position: 'relative',
        }}
      >
        <IconBell size={18} filled={feed.nao_lidas > 0} />
        {feed.nao_lidas > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            minWidth: '1.1rem', height: '1.1rem', padding: '0 0.25rem',
            background: 'var(--wine-400)', color: '#fff',
            borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{feed.nao_lidas > 9 ? '9+' : feed.nao_lidas}</span>
        )}
      </button>

      {open && (
        <div role="menu" className="nav-menu fade-up" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)',
          width: '340px', maxWidth: 'calc(100vw - 2rem)',
          background: 'rgba(58, 12, 24, 0.98)', backdropFilter: 'blur(14px)',
          border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)', padding: '0.5rem', zIndex: 30,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem 0.6rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>Notificações</strong>
            {feed.nao_lidas > 0 && (
              <button onClick={marcarTodas} className="muted" style={{ fontSize: '0.72rem', color: 'var(--gold-400)' }}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 0.25rem 0.4rem' }} />

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {feed.items.length === 0 ? (
              <p className="muted" style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
                Nenhuma notificação ainda.
              </p>
            ) : (
              feed.items.map((n) => (
                <button
                  key={n.id}
                  role="menuitem"
                  onClick={() => abrir(n)}
                  className="notif-item"
                  style={{
                    display: 'flex', gap: '0.65rem', width: '100%', textAlign: 'left',
                    padding: '0.7rem 0.65rem', borderRadius: 'var(--radius-sm)',
                    background: n.lida ? 'transparent' : 'rgba(212,164,58,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden style={{
                    flexShrink: 0, width: '8px', height: '8px', marginTop: '0.4rem',
                    borderRadius: '50%',
                    background: n.lida ? 'transparent' : 'var(--gold-500)',
                    border: n.lida ? '1px solid var(--border-subtle)' : 'none',
                  }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--cream-100)' }}>{n.titulo}</span>
                    {n.mensagem && (
                      <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--stone-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.mensagem}</span>
                    )}
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--stone-500)', marginTop: '0.15rem' }}>{tempoRelativo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <style>{`.notif-item:hover { background: rgba(212,164,58,0.12) !important; }`}</style>
        </div>
      )}
    </div>
  );
}
