import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { StarRating } from './StarRating';
import { FavoriteButton } from './FavoriteButton';
import { money } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/produto/${product.id}`}
      className="card fade-up"
      style={{
        display: 'block',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div style={{
        aspectRatio: '4 / 3',
        background: product.imagem
          ? `url(${product.imagem}) center/cover`
          : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
        position: 'relative',
      }}>
        <span className="badge badge-gold" style={{
          position: 'absolute', top: '0.75rem', left: '0.75rem',
        }}>{product.categoria}</span>
        <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem' }}>
          <FavoriteButton produtoId={product.id} size={16} />
        </div>
        {product.estoque <= 3 && product.estoque > 0 && (
          <span className="badge badge-wine" style={{
            position: 'absolute', bottom: '0.75rem', left: '0.75rem',
          }}>Últimas {product.estoque}</span>
        )}
        {product.estoque === 0 && (
          <span className="badge badge-error" style={{
            position: 'absolute', bottom: '0.75rem', left: '0.75rem',
          }}>Esgotado</span>
        )}
      </div>
      <div style={{ padding: '1.25rem' }}>
        <h3 style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--cream-100)',
          marginBottom: '0.25rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{product.nome}</h3>
        <p style={{
          color: 'var(--stone-400)',
          fontSize: '0.8rem',
          marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <span>por {product.vendedor_nome}</span>
          <StarRating value={product.vendedor_reputacao} size={11} />
        </p>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          fontWeight: 600,
          color: 'var(--gold-400)',
        }}>
          {money(product.preco)}
        </p>
      </div>
    </Link>
  );
}
