import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { ApiError } from '../services/api';
import { IconMinus, IconPlus } from '../components/Icons';

export function Cart() {
  const { cart, update, remove, clear, loading } = useCart();
  const { toast } = useToast();
  const nav = useNavigate();

  async function change(itemId: number, qty: number) {
    try {
      await update(itemId, qty);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    }
  }

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em', marginBottom: '2rem' }}>
        MEU CARRINHO
      </h1>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : cart.items.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p className="muted mb-2">Seu carrinho está vazio.</p>
          <Link to="/catalogo" className="btn btn-primary">Explorar produtos</Link>
        </div>
      ) : (
        <div className="cart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.items.map((item) => (
              <div key={item.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{
                  width: '100px', height: '100px',
                  borderRadius: '10px', flexShrink: 0,
                  background: item.produto_imagem
                    ? `url(${item.produto_imagem}) center/cover`
                    : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/produto/${item.produto_id}`} style={{ color: 'var(--cream-100)', fontWeight: 600 }}>
                    {item.produto_nome}
                  </Link>
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    por {item.vendedor_nome}
                  </p>
                  <p className="gold" style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '0.35rem' }}>
                    R$ {item.preco_unitario.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.2rem' }}>
                    <button className="btn btn-ghost" style={{ width: '1.9rem', height: '1.9rem', padding: 0, borderRadius: '50%' }} aria-label="Diminuir"
                      onClick={() => change(item.id, Math.max(1, item.quantidade - 1))}><IconMinus size={12} /></button>
                    <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{item.quantidade}</span>
                    <button className="btn btn-ghost" style={{ width: '1.9rem', height: '1.9rem', padding: 0, borderRadius: '50%' }} aria-label="Aumentar"
                      onClick={() => change(item.id, Math.min(item.produto_estoque, item.quantidade + 1))}><IconPlus size={12} /></button>
                  </div>
                  <button className="btn btn-danger" style={{ padding: '0.4rem 0.9rem', fontSize: '0.7rem' }}
                    onClick={() => remove(item.id)}>Remover</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={clear} style={{ alignSelf: 'flex-start', fontSize: '0.75rem' }}>
              Limpar carrinho
            </button>
          </div>

          <div>
            <div className="card" style={{ padding: '2rem', position: 'sticky', top: '6rem' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Resumo</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="muted">Subtotal</span>
                <span>R$ {cart.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span className="muted">Frete</span>
                <span className="muted">Grátis</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <strong>Total</strong>
                <strong className="gold" style={{ fontSize: '1.4rem' }}>R$ {cart.total.toFixed(2).replace('.', ',')}</strong>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => nav('/checkout')}>
                Finalizar Compra
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .cart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
