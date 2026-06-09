import { Link } from 'react-router-dom';

const SOCIALS = [
  {
    name: 'Instagram',
    href: 'https://instagram.com/nundinae',
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    name: 'X',
    href: 'https://x.com/nundinae',
    path: <path d="M4 3l7 9-7 9h2.5l5.5-7 5 7H21l-7.3-10L20.5 3H18l-4.8 6.2L8.7 3z" fill="currentColor" stroke="none" />,
  },
  {
    name: 'Facebook',
    href: 'https://facebook.com/nundinae',
    path: <path d="M14 8.5V7c0-.8.5-1 1-1h1.5V3H14c-2 0-3.5 1.3-3.5 3.6V8.5H8V11.5h2.5V21h3.5v-9.5h2.4l.6-3H14z" fill="currentColor" stroke="none" />,
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/@nundinae',
    path: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
        <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

function SocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function Footer() {
  return (
    <footer style={{
      marginTop: '4rem',
      padding: '3.5rem 0 2rem',
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(0,0,0,0.2)',
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1.4fr) repeat(3, minmax(120px, 1fr))',
        gap: '2.5rem',
      }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.12em' }}>
            NUNDINAE
          </p>
          <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.6rem', lineHeight: 1.6, maxWidth: '300px' }}>
            Marketplace de artesanato e arte inspirados na Roma antiga. Conectamos
            artesãos e colecionadores em uma feira moderna.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="social-btn"
              >
                <SocialIcon>{s.path}</SocialIcon>
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <span className="gold footer-title">Explorar</span>
          <Link to="/catalogo" className="footer-link">Catálogo</Link>
          <Link to="/favoritos" className="footer-link">Favoritos</Link>
          <Link to="/sobre" className="footer-link">Sobre nós</Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <span className="gold footer-title">Vender</span>
          <Link to="/vender" className="footer-link">Anunciar produto</Link>
          <a href="#" className="footer-link">Como vender</a>
          <a href="#" className="footer-link">Taxas e tarifas</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <span className="gold footer-title">Suporte</span>
          <a href="#" className="footer-link">Central de ajuda</a>
          <a href="#" className="footer-link">Como comprar</a>
          <a href="#" className="footer-link">Fale conosco</a>
        </div>
      </div>

      <div className="container" style={{
        marginTop: '2.75rem', paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <p className="muted" style={{ fontSize: '0.75rem' }}>
          © 2026 Nundinae. Todos os direitos reservados.
        </p>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <a href="#" className="footer-link" style={{ fontSize: '0.75rem' }}>Termos de uso</a>
          <a href="#" className="footer-link" style={{ fontSize: '0.75rem' }}>Privacidade</a>
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            Pagamentos via Pix processados pelo Mercado Pago.
          </span>
        </div>
      </div>

      <style>{`
        .footer-title {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .footer-link {
          color: var(--cream-200);
          font-size: 0.85rem;
          transition: color 0.2s ease;
        }
        .footer-link:hover { color: var(--gold-400); }
        .social-btn {
          display: grid;
          place-items: center;
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 50%;
          color: var(--cream-200);
          border: 1px solid var(--border-subtle);
          transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .social-btn:hover {
          color: var(--gold-400);
          border-color: var(--gold-500);
          transform: translateY(-2px);
        }
        @media (max-width: 720px) {
          footer .container:first-child {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
