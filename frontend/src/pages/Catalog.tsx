import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { http } from '../services/api';
import type { Category, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') ?? '');
  const categoria = params.get('categoria') ?? '';

  useEffect(() => {
    http.get<Category[]>('/products/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params.get('q')) qs.set('q', params.get('q')!);
    if (params.get('categoria')) qs.set('categoria', params.get('categoria')!);
    http.get<Product[]>(`/products${qs.toString() ? `?${qs}` : ''}`)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [params]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (q) next.set('q', q); else next.delete('q');
    setParams(next);
  }

  function setCategoria(c: string) {
    const next = new URLSearchParams(params);
    if (c) next.set('categoria', c); else next.delete('categoria');
    setParams(next);
  }

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          CATÁLOGO
        </h1>
        <p className="muted">Tesouros da antiga Roma, selecionados a dedo</p>
      </div>

      <form onSubmit={applySearch} style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        <input
          className="input"
          placeholder="Buscar produtos..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: '220px' }}
        />
        <button className="btn btn-primary" style={{ padding: '0.85rem 1.75rem' }}>Buscar</button>
      </form>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <button
          onClick={() => setCategoria('')}
          className={categoria === '' ? 'btn btn-primary' : 'btn btn-ghost'}
          style={{ padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}
        >Todas</button>
        {categories.map((c) => (
          <button
            key={c.categoria}
            onClick={() => setCategoria(c.categoria)}
            className={categoria === c.categoria ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}
          >
            {c.categoria} <span style={{ opacity: 0.6, marginLeft: '0.4rem' }}>({c.total})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p>Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
