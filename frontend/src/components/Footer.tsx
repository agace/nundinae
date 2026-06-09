import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer style={{
      marginTop: '4rem',
      padding: '3rem 0 2rem',
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(0,0,0,0.2)',
    }}>
      <div className="container" style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem',
      }}>
        <div style={{ maxWidth: '320px' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.12em' }}>
            NUNDINAE
          </p>
          <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
            Marketplace de artesanato e arte inspirados na Roma antiga. Conectamos
            artesãos e colecionadores em uma feira moderna.
          </p>
        </div>

        <nav style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <span className="gold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Explorar</span>
            <Link to="/catalogo" className="footer-link">Catálogo</Link>
            <Link to="/sobre" className="footer-link">Sobre</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <span className="gold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Conta</span>
            <Link to="/perfil" className="footer-link">Meu perfil</Link>
            <Link to="/pedidos" className="footer-link">Meus pedidos</Link>
          </div>
        </nav>
      </div>

      <div className="container" style={{
        marginTop: '2.5rem', paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <p className="muted" style={{ fontSize: '0.75rem' }}>
          © 2026 Nundinae. Todos os direitos reservados.
        </p>
        <p className="muted" style={{ fontSize: '0.75rem' }}>
          Pagamentos via Pix processados pelo Mercado Pago.
        </p>
      </div>

      <style>{`
        .footer-link {
          color: var(--cream-200);
          font-size: 0.85rem;
          transition: color 0.2s ease;
        }
        .footer-link:hover { color: var(--gold-400); }
      `}</style>
    </footer>
  );
}
