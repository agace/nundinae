import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { http } from '../services/api';
import type { Category } from '../types';
import { IconSparkle, IconBolt, IconStar } from '../components/Icons';

function Pillar({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      className="hero-pillar"
      viewBox="0 0 60 400"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: 'clamp(2rem, 6vw, 6rem)',
        width: '110px',
        height: '78%',
        zIndex: 1,
        fill: 'rgba(255, 255, 255, 0.035)',
        pointerEvents: 'none',
      }}
    >
      {/* Capital */}
      <rect x="0" y="0" width="60" height="14" />
      <rect x="4" y="14" width="52" height="8" />
      <rect x="8" y="22" width="44" height="6" />
      {/* Fuste */}
      <rect x="12" y="28" width="36" height="344" />
      {/* Base */}
      <rect x="8" y="372" width="44" height="6" />
      <rect x="4" y="378" width="52" height="8" />
      <rect x="0" y="386" width="60" height="14" />
    </svg>
  );
}

export function Landing() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    http.get<Category[]>('/products/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero-section" style={{
        position: 'relative',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        padding: '4rem 0',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <Pillar side="left" />
        <Pillar side="right" />

        <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <h1 className="fade-up" style={{
            fontSize: 'clamp(3rem, 8vw, 5.5rem)',
            fontWeight: 500,
            letterSpacing: '0.08em',
            margin: '0 0 1.25rem',
            background: 'linear-gradient(135deg, var(--cream-100) 30%, var(--gold-400) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>NUNDINAE</h1>

          <p className="fade-up" style={{
            maxWidth: '640px', margin: '0 auto 3rem',
            fontSize: '1.15rem',
            color: 'var(--cream-200)',
            lineHeight: 1.75,
          }}>
            Descubra artesanato único, produtos tradicionais e especiarias raras
            em um marketplace inspirado no grande mercado da antiga Roma.
          </p>

          <div className="fade-up" style={{
            display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Link to="/catalogo" className="btn btn-primary" style={{ padding: '1.05rem 2.5rem' }}>
              Explorar Produtos
            </Link>
            <Link to="/registro" className="btn btn-outline" style={{ padding: '1.05rem 2.5rem' }}>
              Tornar-se Vendedor
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="section-pad" style={{ padding: '3rem 0 5rem' }}>
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}>Categorias</h2>
            <p className="muted">Explore os produtos organizados por tradição</p>
          </div>

          <div className="reveal" style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {categories.length > 0 ? categories.map((cat) => (
              <Link
                key={cat.categoria}
                to={`/catalogo?categoria=${encodeURIComponent(cat.categoria)}`}
                className="btn btn-outline"
                style={{ padding: '1rem 2rem' }}
              >
                {cat.categoria.toUpperCase()} <span style={{
                  marginLeft: '0.6rem',
                  background: 'rgba(212,164,58,0.15)',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                }}>{cat.total}</span>
              </Link>
            )) : (
              ['Joias', 'Cerâmicas e Louças', 'Artes e Quadros'].map((c) => (
                <div key={c} className="btn btn-outline" style={{ padding: '1rem 2rem', opacity: 0.6 }}>
                  {c.toUpperCase()}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* DESTAQUES */}
      <section className="section-pad" style={{ padding: '4rem 0 6rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '3rem 2.5rem',
          }}>
            {[
              {
                Icon: IconSparkle,
                title: 'Artesanato autêntico',
                text: 'Peças únicas feitas à mão por artesãos que preservam técnicas milenares.',
              },
              {
                Icon: IconBolt,
                title: 'Pagamento seguro',
                text: 'Transações criptografadas e sistema de reputação transparente.',
              },
              {
                Icon: IconStar,
                title: 'Vendedores confiáveis',
                text: 'Avaliações reais de compradores garantem a qualidade do mercado.',
              },
            ].map(({ Icon, title, text }) => (
              <div key={title} className="reveal">
                <Icon size={22} stroke="var(--gold-400)" style={{ marginBottom: '1rem', color: 'var(--gold-400)' }} />
                <h3 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  letterSpacing: '0',
                  marginBottom: '0.5rem',
                  color: 'var(--cream-100)',
                }}>
                  {title}
                </h3>
                <p style={{ color: 'var(--stone-400)', fontSize: '0.92rem', lineHeight: 1.65 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE — TEASER */}
      <section className="section-pad" style={{
        padding: '5rem 0',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(0, 0, 0, 0.15)',
      }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '3rem',
          alignItems: 'center',
        }}>
          <div className="reveal">
            <p className="gold" style={{
              fontSize: '0.72rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}>
              Nossa História
            </p>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              letterSpacing: '0.04em',
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, var(--cream-100) 30%, var(--gold-400) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              O espírito das feiras romanas
            </h2>
            <p style={{ color: 'var(--cream-200)', lineHeight: 1.85, marginBottom: '1.25rem' }}>
              Na Roma antiga, a cada nove dias camponeses e artesãos desciam até o Fórum
              para expor suas mercadorias. Chamavam esses dias de{' '}
              <strong className="gold">Nundinae</strong>, um encontro vivo de trocas, conversas e cultura.
            </p>
            <p className="muted" style={{ fontSize: '0.92rem', marginBottom: '2rem' }}>
              Trazemos esse espírito para o digital: uma praça aberta, transparente e acolhedora
              para quem cria e para quem busca algo especial.
            </p>
            <Link to="/sobre" className="btn btn-outline" style={{ padding: '0.9rem 2rem' }}>
              Conhecer o projeto
            </Link>
          </div>

          <div className="reveal" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
          }}>
            {[
              { num: 'I', label: 'Autenticidade' },
              { num: 'II', label: 'Transparência' },
              { num: 'III', label: 'Comunidade' },
              { num: 'IV', label: 'Tradição' },
            ].map((p) => (
              <div key={p.label} style={{
                padding: '1.75rem 1.25rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(42, 8, 17, 0.35)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  border: '1.5px solid var(--gold-500)',
                  color: 'var(--gold-400)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  margin: '0 auto 0.9rem',
                }}>{p.num}</div>
                <p style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--cream-200)',
                }}>{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section-pad" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container reveal" style={{ maxWidth: '680px' }}>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '1.25rem',
          }}>
            Pronto para entrar no Fórum?
          </h2>
          <p className="muted" style={{ marginBottom: '2.5rem', fontSize: '1rem' }}>
            Navegue pelos produtos, descubra a história por trás do projeto ou cadastre-se
            para começar a vender.
          </p>
          <div style={{
            display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Link to="/catalogo" className="btn btn-primary" style={{ padding: '1rem 2.25rem' }}>
              Ver Catálogo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
