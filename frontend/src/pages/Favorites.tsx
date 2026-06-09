import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../services/api';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { useFavorites } from '../contexts/FavoritesContext';

export function Favorites() {
  const { ids } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Recarrega a lista sempre que o conjunto de favoritos muda (ex.: desfavoritar daqui).
  useEffect(() => {
    setLoading(true);
    http.get<Product[]>('/favorites')
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [ids]);

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
        LISTA DE DESEJOS
      </h1>
      <p className="muted" style={{ marginBottom: '2rem' }}>
        Os produtos que você favoritou ficam guardados aqui.
      </p>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: '1.25rem' }}>
            Sua lista de desejos está vazia. Toque no coração dos produtos para salvá-los.
          </p>
          <Link to="/catalogo" className="btn btn-primary">Explorar catálogo</Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
