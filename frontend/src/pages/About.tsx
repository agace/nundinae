import { Link } from 'react-router-dom';

export function About() {
  return (
    <div className="container" style={{ padding: '4rem 2rem 6rem', maxWidth: '960px' }}>
      {/* HEADER */}
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <p className="gold" style={{
          fontSize: '0.75rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>
          Nossa História
        </p>
        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
          letterSpacing: '0.04em',
          background: 'linear-gradient(135deg, var(--cream-100) 30%, var(--gold-400) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '1rem',
        }}>
          Sobre o Nundinae
        </h1>
        <p className="muted" style={{ maxWidth: '560px', margin: '0 auto', fontSize: '1rem' }}>
          Um mercado contemporâneo que respira a tradição das antigas praças romanas.
        </p>
      </header>

      {/* ORIGEM */}
      <section className="fade-up" style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', letterSpacing: '0.04em' }}>
          A origem do nome
        </h2>
        <p style={{ lineHeight: 1.85, color: 'var(--cream-200)', marginBottom: '1rem' }}>
          Na Roma antiga, a cada nove dias (<em>nundinum</em>) os camponeses e artesãos
          desciam de vilas distantes até o Fórum para expor suas mercadorias.
          Esses dias de feira eram chamados de <strong className="gold">Nundinae</strong>
          {''}, um momento em que a cidade pulsava em ofertas, conversas e trocas.
        </p>
        <p style={{ lineHeight: 1.85, color: 'var(--cream-200)' }}>
          Séculos depois, trazemos esse espírito para o ambiente digital: uma praça aberta
          onde pessoas de qualquer canto podem oferecer seu trabalho e encontrar o que procuram,
          com a confiança e a simplicidade do comércio tradicional.
        </p>
      </section>

      {/* VALORES */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        {[
          {
            num: 'I',
            title: 'Autenticidade',
            text: 'Valorizamos o artesanato manual e a tradição preservada por gerações.',
          },
          {
            num: 'II',
            title: 'Transparência',
            text: 'Sistema de reputação público para que toda compra seja uma escolha consciente.',
          },
          {
            num: 'III',
            title: 'Comunidade',
            text: 'Vendedores e compradores constroem juntos um mercado justo e próspero.',
          },
        ].map((v) => (
          <div key={v.title} className="card fade-up" style={{ padding: '2rem' }}>
            <div style={{
              width: '2.75rem', height: '2.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              border: '1.5px solid var(--gold-500)',
              color: 'var(--gold-400)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              marginBottom: '1.25rem',
            }}>{v.num}</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.6rem' }}>{v.title}</h3>
            <p style={{ color: 'var(--cream-200)', fontSize: '0.9rem', lineHeight: 1.65 }}>
              {v.text}
            </p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <Link to="/catalogo" className="btn btn-primary" style={{ padding: '1.05rem 2.5rem' }}>
          Explorar o Mercado
        </Link>
      </div>
    </div>
  );
}
