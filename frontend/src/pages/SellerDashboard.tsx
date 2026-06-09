import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { http, ApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { StarRating } from '../components/StarRating';
import { IconPlus } from '../components/Icons';

const CATEGORIAS_SUGERIDAS = ['Joias', 'Cerâmicas e Louças', 'Artes e Quadros', 'Especiarias', 'Vestuário'];

export function SellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  if (user?.tipo === 'comprador') {
    return <Navigate to="/catalogo" replace />;
  }

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await http.get<Product[]>(`/products?vendedor_id=${user.id}`);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm('Excluir este produto?')) return;
    try {
      await http.delete(`/products/${id}`);
      toast('Produto removido', 'success');
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    }
  }

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em' }}>MINHA LOJA</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <span className="muted">Reputação:</span>
            <StarRating value={user.reputacao} showValue />
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              ({user.total_avaliacoes ?? 0} avaliações)
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} style={{ gap: '0.5rem' }}>
          <IconPlus size={14} /> Novo Produto
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p className="muted mb-2">Você ainda não tem produtos à venda.</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>Cadastrar primeiro produto</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {products.map((p) => (
            <div key={p.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '10px', flexShrink: 0,
                background: p.imagem ? `url(${p.imagem}) center/cover` : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600 }}>{p.nome}</p>
                <p className="muted" style={{ fontSize: '0.8rem' }}>{p.categoria} · Estoque: {p.estoque}</p>
                <p className="gold" style={{ fontWeight: 600 }}>R$ {p.preco.toFixed(2).replace('.', ',')}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setEditing(p)} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>Editar</button>
                <button className="btn btn-danger" onClick={() => deleteProduct(p.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ProductFormModal
          product={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  product, onClose, onSaved,
}: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [nome, setNome] = useState(product?.nome ?? '');
  const [descricao, setDescricao] = useState(product?.descricao ?? '');
  const [preco, setPreco] = useState(product?.preco?.toString() ?? '');
  const [estoque, setEstoque] = useState(product?.estoque?.toString() ?? '');
  const [imagem, setImagem] = useState(product?.imagem ?? '');
  const [categoria, setCategoria] = useState(product?.categoria ?? CATEGORIAS_SUGERIDAS[0]);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nome, descricao,
        preco: Number(preco),
        estoque: Number(estoque),
        imagem: imagem || null,
        categoria,
      };
      if (product) {
        await http.put(`/products/${product.id}`, payload);
        toast('Produto atualizado', 'success');
      } else {
        await http.post('/products', payload);
        toast('Produto cadastrado', 'success');
      }
      onSaved();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'grid', placeItems: 'center', padding: '2rem', zIndex: 50,
      backdropFilter: 'blur(4px)', overflow: 'auto',
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card fade-up" style={{ width: '100%', maxWidth: '560px', padding: '2rem', margin: 'auto' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '1.5rem' }}>
          {product ? 'Editar produto' : 'Novo produto'}
        </h2>

        <div className="field">
          <label className="label">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
        </div>
        <div className="field">
          <label className="label">Descrição</label>
          <textarea className="input" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Preço (R$)</label>
            <input className="input" type="number" step="0.01" min="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Estoque</label>
            <input className="input" type="number" min="0" value={estoque} onChange={(e) => setEstoque(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label className="label">Categoria</label>
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_SUGERIDAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">URL da imagem</label>
          <input className="input" type="url" value={imagem} onChange={(e) => setImagem(e.target.value)} placeholder="https://..." />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Salvando...' : product ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
