import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { http, ApiError } from '../services/api';
import type { Product, Review, Question } from '../types';
import { StarRating } from '../components/StarRating';
import { IconMinus, IconPlus, IconChat } from '../components/Icons';
import { FavoriteButton } from '../components/FavoriteButton';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';

export function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    setLoading(true);
    http.get<Product>(`/products/${id}`)
      .then((p) => {
        setProduct(p);
        return Promise.all([
          http.get<Review[]>(`/reviews/seller/${p.vendedor_id}`),
          http.get<Question[]>(`/products/${p.id}/questions`),
        ]);
      })
      .then(([revs, qs]) => { setReviews(revs); setQuestions(qs); })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) nav('/catalogo');
      })
      .finally(() => setLoading(false));
  }, [id, nav]);

  async function reloadQuestions(produtoId: number) {
    const qs = await http.get<Question[]>(`/products/${produtoId}/questions`);
    setQuestions(qs);
  }

  async function handleAdd() {
    if (!user) { nav('/login', { state: { from: `/produto/${id}` } }); return; }
    if (!product) return;
    setAdding(true);
    try {
      await add(product.id, qty);
      toast(`${product.nome} adicionado ao carrinho.`, 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao adicionar', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    if (!user) { nav('/login', { state: { from: `/produto/${id}` } }); return; }
    if (!product) return;
    setBuying(true);
    try {
      await add(product.id, qty);
      nav('/checkout');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao comprar', 'error');
      setBuying(false);
    }
  }

  if (loading || !product) {
    return <div style={{ display: 'grid', placeItems: 'center', padding: '6rem' }}><div className="spinner" /></div>;
  }

  const isOwnProduct = user?.id === product.vendedor_id;

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '3rem',
        alignItems: 'start',
      }}>
        <div className="card" style={{
          aspectRatio: '1 / 1',
          background: product.imagem
            ? `url(${product.imagem}) center/cover`
            : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
        }} />

        <div>
          <span className="badge badge-gold">{product.categoria}</span>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            margin: '1rem 0 0.5rem',
            letterSpacing: '0.02em',
          }}>{product.nome}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--cream-200)' }}>por <strong>{product.vendedor_nome}</strong></span>
            <StarRating value={product.vendedor_reputacao} showValue />
          </div>

          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.75rem',
            color: 'var(--gold-400)',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            R$ {product.preco.toFixed(2).replace('.', ',')}
          </p>

          <p style={{ color: 'var(--cream-200)', lineHeight: 1.75, marginBottom: '2rem' }}>
            {product.descricao}
          </p>

          <p className="muted mb-2" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {product.estoque > 0 ? `${product.estoque} unidades em estoque` : 'Produto esgotado'}
          </p>

          {isOwnProduct ? (
            <div className="card" style={{ padding: '1.25rem' }}>
              <p className="muted" style={{ fontSize: '0.9rem' }}>
                Este é seu próprio produto. Vá para <strong>Vender</strong> para editar.
              </p>
            </div>
          ) : product.estoque > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.25rem' }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="btn btn-ghost" style={{ width: '2.25rem', height: '2.25rem', padding: 0, borderRadius: '50%' }} aria-label="Diminuir">
                    <IconMinus size={14} />
                  </button>
                  <span style={{ minWidth: '2rem', textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(Math.min(product.estoque, qty + 1))} className="btn btn-ghost" style={{ width: '2.25rem', height: '2.25rem', padding: 0, borderRadius: '50%' }} aria-label="Aumentar">
                    <IconPlus size={14} />
                  </button>
                </div>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleAdd} disabled={adding || buying}>
                  {adding ? 'Adicionando...' : 'Adicionar ao Carrinho'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleBuyNow} disabled={adding || buying}>
                  {buying ? 'Processando...' : 'Comprar agora'}
                </button>
                <FavoriteButton produtoId={product.id} variant="inline" />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <FavoriteButton produtoId={product.id} variant="inline" />
            </div>
          )}
        </div>
      </div>

      {/* Avaliações do vendedor */}
      <section style={{ marginTop: '5rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', letterSpacing: '0.08em' }}>
          REPUTAÇÃO DO VENDEDOR
        </h2>
        {reviews.length === 0 ? (
          <p className="muted">Ainda sem avaliações.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {reviews.map((r) => (
              <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{r.avaliador_nome}</strong>
                  <StarRating value={r.nota} />
                </div>
                <p style={{ color: 'var(--cream-200)' }}>{r.comentario}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <QuestionsSection
        product={product}
        questions={questions}
        isOwner={isOwnProduct}
        onChanged={() => reloadQuestions(product.id)}
      />
    </div>
  );
}

function QuestionsSection({
  product, questions, isOwner, onChanged,
}: { product: Product; questions: Question[]; isOwner: boolean; onChanged: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [pergunta, setPergunta] = useState('');
  const [sending, setSending] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answering, setAnswering] = useState<number | null>(null);

  async function enviarPergunta() {
    if (pergunta.trim().length < 3) return;
    if (!user) { nav('/login'); return; }
    setSending(true);
    try {
      await http.post(`/products/${product.id}/questions`, { pergunta });
      setPergunta('');
      toast('Pergunta enviada! O vendedor será notificado.', 'success');
      onChanged();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao perguntar', 'error');
    } finally {
      setSending(false);
    }
  }

  async function responder(perguntaId: number) {
    const resposta = (answers[perguntaId] ?? '').trim();
    if (!resposta) return;
    setAnswering(perguntaId);
    try {
      await http.post(`/questions/${perguntaId}/answer`, { resposta });
      setAnswers((a) => ({ ...a, [perguntaId]: '' }));
      toast('Resposta publicada.', 'success');
      onChanged();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao responder', 'error');
    } finally {
      setAnswering(null);
    }
  }

  return (
    <section style={{ marginTop: '4rem' }}>
      <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <IconChat size={22} /> PERGUNTAS E RESPOSTAS
      </h2>

      {!isOwner && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <label className="label">Pergunte ao vendedor</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: '200px' }}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') enviarPergunta(); }}
              placeholder="Ex.: Vocês enviam para minha região?"
              maxLength={500}
            />
            <button className="btn btn-primary" onClick={enviarPergunta} disabled={sending || pergunta.trim().length < 3}>
              {sending ? 'Enviando...' : 'Perguntar'}
            </button>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <p className="muted">Ainda não há perguntas. {isOwner ? '' : 'Seja o primeiro a perguntar!'}</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {questions.map((q) => (
            <div key={q.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--cream-100)' }}>{q.pergunta}</p>
                <span className="muted" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {new Date(q.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>por {q.autor_nome}</p>

              {q.resposta ? (
                <div style={{ marginTop: '0.85rem', paddingLeft: '0.85rem', borderLeft: '2px solid var(--gold-500)' }}>
                  <p className="gold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Resposta do vendedor</p>
                  <p style={{ color: 'var(--cream-200)' }}>{q.resposta}</p>
                </div>
              ) : isOwner ? (
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: '200px' }}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Escreva sua resposta..."
                    maxLength={500}
                  />
                  <button className="btn btn-outline" onClick={() => responder(q.id)} disabled={answering === q.id}>
                    {answering === q.id ? 'Enviando...' : 'Responder'}
                  </button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.6rem', fontStyle: 'italic' }}>Aguardando resposta do vendedor.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
