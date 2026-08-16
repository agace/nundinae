import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { http, ApiError } from '../services/api';
import { fetchAddressByCep, cepDigits } from '../services/cep';
import type { CouponValidation } from '../types';
import { IconBolt, IconCreditCard, IconDocument, IconInfo, IconTag } from '../components/Icons';
import {
  CardForm, PixPanel, BoletoPanel, RealPixCharge, emptyCard, validateCard,
  formatCpf, cpfValid, gerarPixCode, gerarBoletoLinha, type CardData,
} from '../components/PaymentForms';
import { money } from '../utils/format';

interface PixCharge {
  pedido_id: number;
  qr_code: string;
  qr_code_base64: string;
}

type Metodo = 'cartao' | 'pix' | 'boleto';

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

interface CheckoutResponse {
  pedido_id: number;
  status: string;
  pagamento?: string;
  payment_required: boolean;
  total: number;
  metodo: string;
  pix?: { qr_code: string; qr_code_base64: string; ticket_url?: string };
}

const METODOS: { v: Metodo; label: string; icon: typeof IconBolt }[] = [
  { v: 'pix', label: 'Pix', icon: IconBolt },
  { v: 'cartao', label: 'Cartão', icon: IconCreditCard },
  { v: 'boleto', label: 'Boleto', icon: IconDocument },
];

export function Checkout() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [metodo, setMetodo] = useState<Metodo>('pix');
  const [loading, setLoading] = useState(false);

  const [pixReal, setPixReal] = useState(false);
  const [cpf, setCpf] = useState('');
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const [verificando, setVerificando] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Os dados do cartão ficam só no front: nunca são enviados nem persistidos.
  const [card, setCard] = useState<CardData>(emptyCard);

  const [cupomInput, setCupomInput] = useState('');
  const [cupom, setCupom] = useState<CouponValidation | null>(null);
  const [cupomLoading, setCupomLoading] = useState(false);

  const desconto = cupom?.desconto ?? 0;
  const totalFinal = Math.max(cart.total - desconto, 0);

  const pixCode = useMemo(() => gerarPixCode(totalFinal), [totalFinal]);
  const boletoLinha = useMemo(() => gerarBoletoLinha(), []);
  const boletoVencimento = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString('pt-BR');
  }, []);

  const [endereco, setEndereco] = useState({
    cep: user?.endereco_cep ?? '',
    logradouro: user?.endereco_logradouro ?? '',
    numero: user?.endereco_numero ?? '',
    complemento: user?.endereco_complemento ?? '',
    bairro: user?.endereco_bairro ?? '',
    cidade: user?.endereco_cidade ?? '',
    estado: user?.endereco_estado ?? '',
  });

  const [cepLoading, setCepLoading] = useState(false);

  function setEnd<K extends keyof typeof endereco>(key: K, value: string) {
    setEndereco((e) => ({ ...e, [key]: value }));
  }

  async function onCepChange(value: string) {
    setEnd('cep', value);
    if (cepDigits(value).length !== 8) return;
    setCepLoading(true);
    const addr = await fetchAddressByCep(value);
    setCepLoading(false);
    if (!addr) {
      toast('CEP não encontrado.', 'info');
      return;
    }
    setEndereco((e) => ({
      ...e,
      logradouro: addr.logradouro || e.logradouro,
      bairro: addr.bairro || e.bairro,
      cidade: addr.cidade || e.cidade,
      estado: addr.estado || e.estado,
    }));
  }

  useEffect(() => {
    http.get<{ mercadopago: boolean }>('/payments/mode')
      .then((r) => setPixReal(r.mercadopago))
      .catch(() => setPixReal(false));
  }, []);

  // Com uma cobrança Pix aberta, consulta a confirmação periodicamente.
  useEffect(() => {
    if (!pixCharge) return;
    setVerificando(true);
    const pedidoId = pixCharge.pedido_id;
    const check = async () => {
      try {
        const r = await http.post<{ status: string }>(`/orders/${pedidoId}/confirm`);
        if (r.status === 'pago') {
          if (pollRef.current) clearInterval(pollRef.current);
          await refresh();
          toast('Pagamento PIX confirmado!', 'success');
          nav('/pedidos', { state: { highlight: pedidoId } });
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    };
    pollRef.current = window.setInterval(check, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); setVerificando(false); };
  }, [pixCharge, refresh, toast, nav]);

  async function verificarAgora() {
    if (!pixCharge) return;
    setLoading(true);
    try {
      const r = await http.post<{ status: string }>(`/orders/${pixCharge.pedido_id}/confirm`);
      if (r.status === 'pago') {
        await refresh();
        toast('Pagamento confirmado!', 'success');
        nav('/pedidos', { state: { highlight: pixCharge.pedido_id } });
      } else {
        toast('Pagamento ainda não identificado. Assim que cair, confirmamos automaticamente.', 'info');
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao verificar', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function aplicarCupom() {
    const codigo = cupomInput.trim();
    if (!codigo) return;
    setCupomLoading(true);
    try {
      const res = await http.post<CouponValidation>('/coupons/validate', { codigo });
      setCupom(res);
      toast(`Cupom ${res.codigo} aplicado: -${money(res.desconto)}`, 'success');
    } catch (err) {
      setCupom(null);
      toast(err instanceof ApiError ? err.message : 'Cupom inválido', 'error');
    } finally {
      setCupomLoading(false);
    }
  }

  function removerCupom() {
    setCupom(null);
    setCupomInput('');
  }

  async function pay() {
    if (cart.items.length === 0) return;

    const obrigatorios: (keyof typeof endereco)[] = ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];
    if (obrigatorios.some((k) => !endereco[k].trim())) {
      toast('Preencha o endereço de entrega antes de pagar.', 'error');
      return;
    }

    if (metodo === 'cartao') {
      const erro = validateCard(card);
      if (erro) { toast(erro, 'error'); return; }
    }

    // Pix real: gera a cobrança e entra em modo de espera pela confirmação.
    if (metodo === 'pix' && pixReal) {
      if (!cpfValid(cpf)) { toast('Informe um CPF válido para gerar o Pix.', 'error'); return; }
      setLoading(true);
      try {
        const res = await http.post<CheckoutResponse>('/orders/checkout', {
          metodo, endereco, cupom: cupom?.codigo ?? null, cpf,
        });
        if (res.pix?.qr_code) {
          setPixCharge({ pedido_id: res.pedido_id, qr_code: res.pix.qr_code, qr_code_base64: res.pix.qr_code_base64 });
        } else {
          toast('Não foi possível gerar o Pix.', 'error');
        }
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Erro ao gerar o Pix', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await http.post<CheckoutResponse>('/orders/checkout', {
        metodo,
        endereco,
        cupom: cupom?.codigo ?? null,
      });

      await refresh();
      if (res.pagamento === 'aprovado') {
        toast('Pagamento aprovado. Pedido criado com sucesso.', 'success');
        nav('/pedidos', { state: { highlight: res.pedido_id } });
      } else {
        toast('Pagamento recusado. Tente novamente.', 'error');
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro no checkout', 'error');
    } finally {
      setLoading(false);
    }
  }

  const labelBotao = loading
    ? 'Processando...'
    : metodo === 'cartao' ? `Pagar ${money(totalFinal)}`
    : metodo === 'boleto' ? 'Confirmar pagamento do boleto'
    : pixReal ? (pixCharge ? 'Verificar pagamento' : `Gerar Pix de ${money(totalFinal)}`)
    : 'Confirmar pagamento Pix';

  if (cart.items.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p className="muted">Carrinho vazio.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem', maxWidth: '760px' }}>
      <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em', marginBottom: '2rem' }}>
        CHECKOUT
      </h1>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Itens ({cart.items.length})</h2>
        {cart.items.map((i) => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
            <span>{i.quantidade}× {i.produto_nome}</span>
            <span>{money(i.subtotal)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <span className="muted">Subtotal</span>
          <span>{money(cart.total)}</span>
        </div>
        {desconto > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <span style={{ color: 'var(--gold-400)' }}>Desconto ({cupom?.codigo})</span>
            <span style={{ color: 'var(--gold-400)' }}>− {money(desconto)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <strong>Total</strong>
          <strong className="gold" style={{ fontSize: '1.3rem' }}>{money(totalFinal)}</strong>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconTag size={18} /> Cupom de desconto
        </h2>
        {cupom ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
              {cupom.codigo} · {cupom.tipo === 'percentual' ? `${cupom.valor}%` : money(cupom.valor)} off
            </span>
            <button className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.72rem' }} onClick={removerCupom}>
              Remover
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: '180px', textTransform: 'uppercase' }}
              value={cupomInput}
              onChange={(e) => setCupomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') aplicarCupom(); }}
              placeholder="Ex.: ROMA10"
              maxLength={40}
            />
            <button className="btn btn-outline" onClick={aplicarCupom} disabled={cupomLoading || !cupomInput.trim()}>
              {cupomLoading ? 'Validando...' : 'Aplicar'}
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Endereço de entrega</h2>
        <div className="ck-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">CEP {cepLoading && <span className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· buscando...</span>}</label>
            <input className="input" value={endereco.cep} onChange={(e) => onCepChange(e.target.value)} maxLength={9} placeholder="00000-000" inputMode="numeric" />
          </div>
          <div className="field">
            <label className="label">Rua</label>
            <input className="input" value={endereco.logradouro} onChange={(e) => setEnd('logradouro', e.target.value)} maxLength={150} />
          </div>
        </div>
        <div className="ck-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Número</label>
            <input className="input" value={endereco.numero} onChange={(e) => setEnd('numero', e.target.value)} maxLength={20} />
          </div>
          <div className="field">
            <label className="label">Complemento</label>
            <input className="input" value={endereco.complemento} onChange={(e) => setEnd('complemento', e.target.value)} maxLength={100} placeholder="Apto, bloco..." />
          </div>
        </div>
        <div className="ck-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '1rem' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Bairro</label>
            <input className="input" value={endereco.bairro} onChange={(e) => setEnd('bairro', e.target.value)} maxLength={100} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Cidade</label>
            <input className="input" value={endereco.cidade} onChange={(e) => setEnd('cidade', e.target.value)} maxLength={100} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">UF</label>
            <select className="input" value={endereco.estado} onChange={(e) => setEnd('estado', e.target.value)}>
              <option value="">—</option>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Método de pagamento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {METODOS.map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => { setMetodo(v); setPixCharge(null); }}
              className={metodo === v ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '1.25rem 0.5rem', fontSize: '0.85rem', flexDirection: 'column', gap: '0.65rem' }}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>

        {/* Painel do método escolhido */}
        <div style={{ marginTop: '1.75rem' }}>
          {metodo === 'cartao' && <CardForm card={card} onChange={setCard} />}
          {metodo === 'boleto' && <BoletoPanel total={totalFinal} linhaDigitavel={boletoLinha} vencimento={boletoVencimento} />}
          {metodo === 'pix' && (
            pixReal ? (
              pixCharge ? (
                <RealPixCharge
                  qrCodeBase64={pixCharge.qr_code_base64}
                  qrCode={pixCharge.qr_code}
                  total={totalFinal}
                  verificando={verificando}
                />
              ) : (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">CPF do pagador</label>
                  <input
                    className="input" inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00" maxLength={14}
                  />
                  <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
                    Ao gerar, criamos uma cobrança Pix no Mercado Pago. Você paga
                    pelo app do banco e a confirmação é automática.
                  </p>
                </div>
              )
            ) : (
              <PixPanel total={totalFinal} codigo={pixCode} />
            )
          )}
        </div>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '1.15rem' }}
        onClick={pixCharge ? verificarAgora : pay}
        disabled={loading}
      >
        {labelBotao}
      </button>

      {metodo === 'pix' && pixReal && (
        <div className="muted" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          marginTop: '1rem', fontSize: '0.75rem',
        }}>
          <IconInfo size={14} />
          <span>Pagamento Pix processado com segurança pelo Mercado Pago.</span>
        </div>
      )}
    </div>
  );
}
