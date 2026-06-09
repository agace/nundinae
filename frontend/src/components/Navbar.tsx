import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { IconCart, IconLogout } from './Icons';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalItems = cart.items.reduce((s, i) => s + i.quantidade, 0);

  // Fecha o menu do usuário ao clicar fora.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'rgba(42, 8, 17, 0.85)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div className="container nav-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.1rem 2rem',
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem',
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--cream-100)',
          letterSpacing: '0.12em',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '2.2rem', height: '2.2rem',
            borderRadius: '50%',
            border: '1.5px solid var(--gold-500)',
            color: 'var(--gold-500)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 600,
          }}>N</span>
          <span className="nav-brand-text">NUNDINAE</span>
        </Link>

        <nav className="nav-center" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <NavLink to="/" end className="nav-link">Home</NavLink>
          <NavLink to="/catalogo" className="nav-link">Catálogo</NavLink>
          <NavLink to="/sobre" className="nav-link">Sobre</NavLink>
        </nav>

        <div className="nav-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/carrinho" className="btn btn-ghost" style={{
                padding: '0.6rem 1.1rem',
                fontSize: '0.78rem',
                position: 'relative',
                gap: '0.5rem',
              }}>
                <IconCart size={16} />
                Carrinho
                {totalItems > 0 && (
                  <span style={{
                    background: 'var(--gold-500)',
                    color: 'var(--wine-900)',
                    borderRadius: '999px',
                    padding: '0.1rem 0.55rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}>{totalItems}</span>
                )}
              </Link>

              <NotificationBell />

              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  className="nav-user-chip"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((o) => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.3rem 0.7rem 0.3rem 0.3rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--cream-100)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '2rem', height: '2rem',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--gold-500), var(--gold-700))',
                    color: 'var(--wine-900)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : user.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="nav-user-name" style={{ fontSize: '0.85rem' }}>{user.nome.split(' ')[0]}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{
                    transition: 'transform 0.2s ease',
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                    opacity: 0.7,
                  }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {menuOpen && (
                  <div role="menu" className="nav-menu fade-up" style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 0.5rem)',
                    minWidth: '210px',
                    background: 'rgba(58, 12, 24, 0.98)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-card)',
                    padding: '0.5rem',
                    zIndex: 30,
                  }}>
                    <div style={{ padding: '0.5rem 0.75rem 0.6rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.nome}</div>
                      <div className="muted" style={{ fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 0.25rem 0.4rem' }} />

                    {user.tipo === 'admin' ? (
                      <Link to="/admin" role="menuitem" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                        Painel administrativo
                      </Link>
                    ) : (
                      <>
                        <Link to="/perfil" role="menuitem" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                          Meu perfil
                        </Link>
                        <Link to="/favoritos" role="menuitem" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                          Lista de desejos
                        </Link>
                        {user.tipo !== 'comprador' && (
                          <>
                            <Link to="/vender" role="menuitem" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                              Minha loja
                            </Link>
                            <Link to="/vendas" role="menuitem" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                              Minhas vendas
                            </Link>
                          </>
                        )}
                        <Link to="/pedidos" role="menuitem" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                          Meus pedidos
                        </Link>
                      </>
                    )}

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.4rem 0.25rem' }} />
                    <button
                      role="menuitem"
                      className="nav-menu-item nav-menu-danger"
                      onClick={() => { setMenuOpen(false); logout(); nav('/'); }}
                    >
                      <IconLogout size={14} /> Sair
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ padding: '0.6rem 1.1rem', fontSize: '0.8rem' }}>Entrar</Link>
              <Link to="/registro" className="btn btn-primary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.8rem' }}>Cadastrar</Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        .nav-link {
          color: var(--cream-200);
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 500;
          position: relative;
          transition: color 0.2s ease;
        }
        .nav-link:hover { color: var(--gold-400); }
        .nav-link.active { color: var(--gold-400); }
        .nav-link.active::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          bottom: -6px;
          height: 2px;
          background: var(--gold-500);
          border-radius: 2px;
        }
        .nav-user-chip:hover { border-color: var(--border-strong); }
        .nav-menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          text-align: left;
          padding: 0.6rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--cream-100);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .nav-menu-item:hover { background: rgba(212,164,58,0.1); color: var(--gold-300); }
        .nav-menu-danger { color: var(--wine-300); }
        .nav-menu-danger:hover { background: rgba(162,49,71,0.16); color: var(--wine-300); }
      `}</style>
    </header>
  );
}
