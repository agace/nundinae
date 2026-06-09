import { useState } from 'react';
import { IconCreditCard } from './Icons';

const money = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

// --- Utilidades de cartão --------------------------------------------------

export interface CardData {
  numero: string;
  nome: string;
  validade: string;
  cvv: string;
}

export const emptyCard: CardData = { numero: '', nome: '', validade: '', cvv: '' };

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Algoritmo de Luhn — valida o dígito verificador do número do cartão. */
export function luhnValid(numero: string): boolean {
  const d = onlyDigits(numero);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    soma += n;
    alt = !alt;
  }
  return soma % 10 === 0;
}

export function formatCardNumber(s: string): string {
  return onlyDigits(s).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiry(s: string): string {
  const d = onlyDigits(s).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function expiryValid(s: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(s);
  if (!m) return false;
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const fim = new Date(ano, mes, 0, 23, 59, 59); // último dia do mês
  return fim >= new Date();
}

function bandeira(numero: string): string {
  const d = onlyDigits(numero);
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^(636|438935|504175|451416|636297)/.test(d)) return 'Elo';
  return '';
}

/** Retorna o primeiro erro de validação do cartão, ou null se estiver ok. */
export function validateCard(card: CardData): string | null {
  if (!luhnValid(card.numero)) return 'Número do cartão inválido.';
  if (card.nome.trim().length < 3) return 'Informe o nome impresso no cartão.';
  if (!expiryValid(card.validade)) return 'Validade inválida ou vencida.';
  if (!/^\d{3,4}$/.test(card.cvv)) return 'CVV inválido.';
  return null;
}

// --- Formulário do cartão --------------------------------------------------

export function CardForm({ card, onChange }: { card: CardData; onChange: (c: CardData) => void }) {
  const set = (patch: Partial<CardData>) => onChange({ ...card, ...patch });
  const marca = bandeira(card.numero);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Preview do cartão */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-md)',
        padding: '1.4rem 1.5rem',
        background: 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-card)',
        minHeight: '170px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '2.6rem', height: '1.9rem', borderRadius: '5px', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))' }} />
          <span className="gold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em', fontWeight: 600 }}>
            {marca || 'CARTÃO'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.12em', color: 'var(--cream-100)' }}>
          {card.numero || '•••• •••• •••• ••••'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--cream-200)' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.nome || 'NOME DO TITULAR'}</span>
          <span>{card.validade || 'MM/AA'}</span>
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Número do cartão</label>
        <input
          className="input" inputMode="numeric" autoComplete="cc-number"
          value={card.numero}
          onChange={(e) => set({ numero: formatCardNumber(e.target.value) })}
          placeholder="0000 0000 0000 0000"
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Nome impresso no cartão</label>
        <input
          className="input" autoComplete="cc-name"
          value={card.nome}
          onChange={(e) => set({ nome: e.target.value.toUpperCase() })}
          placeholder="COMO ESTÁ NO CARTÃO"
          maxLength={40}
        />
      </div>
      <div className="ck-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label">Validade</label>
          <input
            className="input" inputMode="numeric" autoComplete="cc-exp"
            value={card.validade}
            onChange={(e) => set({ validade: formatExpiry(e.target.value) })}
            placeholder="MM/AA" maxLength={5}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label">CVV</label>
          <input
            className="input" inputMode="numeric" autoComplete="cc-csc"
            value={card.cvv}
            onChange={(e) => set({ cvv: onlyDigits(e.target.value).slice(0, 4) })}
            placeholder="123" maxLength={4}
          />
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <IconCreditCard size={13} /> Pagamento de demonstração. Não insira os dados de um cartão real.
      </p>
    </div>
  );
}

// --- QR Code "falso" (decorativo, determinístico) --------------------------

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function FakeQRCode({ data, size = 168 }: { data: string; size?: number }) {
  const n = 25;
  const rnd = mulberry32(hashSeed(data));
  const cell = size / n;

  // Padrão localizador (finder) 7x7 nos três cantos, como num QR real.
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, n - 7) || inBox(n - 7, 0);
  };
  const finderFilled = (r: number, c: number, br: number, bc: number) => {
    const lr = r - br, lc = c - bc;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true; // borda
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;     // miolo
    return false;
  };
  const cellFilled = (r: number, c: number) => {
    if (isFinder(r, c)) {
      const br = r < 7 ? 0 : n - 7;
      const bc = c < 7 ? (r < 7 ? (c < 7 ? 0 : n - 7) : 0) : n - 7;
      const realBc = r >= n - 7 ? 0 : (c >= n - 7 ? n - 7 : 0);
      return finderFilled(r, c, br, realBc);
    }
    return rnd() > 0.5;
  };

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (cellFilled(r, c)) {
        rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#1a1a1a" />);
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: '#fff', borderRadius: '8px', padding: '8px', boxSizing: 'content-box' }} role="img" aria-label="QR Code do PIX">
      {rects}
    </svg>
  );
}

export function PixPanel({ total, codigo }: { total: number; codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { /* clipboard indisponível */ }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem', justifyItems: 'center', textAlign: 'center' }}>
      <FakeQRCode data={codigo} />
      <div>
        <p style={{ fontWeight: 600 }}>Pague {money(total)} via Pix</p>
        <p className="muted" style={{ fontSize: '0.8rem' }}>Escaneie o QR Code ou use o código copia e cola.</p>
      </div>
      <div style={{ width: '100%' }}>
        <div className="input" style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--stone-400)', cursor: 'default' }}>
          {codigo}
        </div>
        <button type="button" className="btn btn-outline" style={{ marginTop: '0.6rem' }} onClick={copiar}>
          {copiado ? 'Código copiado!' : 'Copiar código Pix'}
        </button>
      </div>
    </div>
  );
}

// --- CPF (pagador do PIX real) ---------------------------------------------

export function formatCpf(s: string): string {
  return onlyDigits(s).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Validação completa de CPF (dígitos verificadores). */
export function cpfValid(s: string): boolean {
  const d = onlyDigits(s);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Exibe a cobrança PIX REAL gerada pelo Mercado Pago (QR + copia e cola). */
export function RealPixCharge({ qrCodeBase64, qrCode, total, verificando }: {
  qrCodeBase64: string; qrCode: string; total: number; verificando: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(qrCode); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { /* indisponível */ }
  }
  return (
    <div style={{ display: 'grid', gap: '1.1rem', justifyItems: 'center', textAlign: 'center' }}>
      {qrCodeBase64
        ? <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code do Pix" width={200} height={200} style={{ background: '#fff', borderRadius: '8px', padding: '8px' }} />
        : <FakeQRCode data={qrCode} />}
      <div>
        <p style={{ fontWeight: 600 }}>Pague {money(total)} via Pix</p>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Abra o app do seu banco, escaneie o QR Code (ou use o copia e cola) e confirme.
          A aprovação é detectada automaticamente.
        </p>
      </div>
      {qrCode && (
        <div style={{ width: '100%' }}>
          <div className="input" style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--stone-400)', cursor: 'default' }}>{qrCode}</div>
          <button type="button" className="btn btn-outline" style={{ marginTop: '0.6rem' }} onClick={copiar}>
            {copiado ? 'Código copiado!' : 'Copiar código Pix'}
          </button>
        </div>
      )}
      {verificando && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gold-400)' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.85rem' }}>Aguardando confirmação do pagamento...</span>
        </div>
      )}
    </div>
  );
}

// --- Boleto ----------------------------------------------------------------

export function Barcode({ data, height = 56 }: { data: string; height?: number }) {
  const d = onlyDigits(data) || '0';
  const bars: React.ReactNode[] = [];
  let x = 0;
  for (let i = 0; i < d.length; i++) {
    const w = 1 + (Number(d[i]) % 4); // largura 1..4
    const dark = i % 2 === 0;
    if (dark) bars.push(<rect key={i} x={x} y={0} width={w} height={height} fill="#1a1a1a" />);
    x += w + 1;
  }
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" style={{ background: '#fff', borderRadius: '4px' }} role="img" aria-label="Código de barras do boleto">
      {bars}
    </svg>
  );
}

export function BoletoPanel({ total, linhaDigitavel, vencimento }: { total: number; linhaDigitavel: string; vencimento: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(onlyDigits(linhaDigitavel)); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { /* indisponível */ }
  }
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Valor</p>
          <strong className="gold" style={{ fontSize: '1.2rem' }}>{money(total)}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vencimento</p>
          <strong>{vencimento}</strong>
        </div>
      </div>
      <Barcode data={linhaDigitavel} />
      <div>
        <p className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Linha digitável</p>
        <div className="input" style={{ fontFamily: 'monospace', fontSize: '0.8rem', cursor: 'default' }}>{linhaDigitavel}</div>
        <button type="button" className="btn btn-outline" style={{ marginTop: '0.6rem' }} onClick={copiar}>
          {copiado ? 'Copiado!' : 'Copiar linha digitável'}
        </button>
      </div>
    </div>
  );
}

// --- Geradores de código (determinísticos por pedido) ----------------------

/** Código Pix "copia e cola" no formato EMV (decorativo, p/ a demo). */
export function gerarPixCode(total: number): string {
  const valor = total.toFixed(2);
  const txid = Math.random().toString(36).slice(2, 12).toUpperCase();
  return (
    '00020126360014BR.GOV.BCB.PIX0114nundinae@feira52040000' +
    `5303986540${valor.length}${valor}5802BR5908NUNDINAE6009SAO PAULO` +
    `62070503${txid}6304`
  );
}

/** Linha digitável de boleto (47 dígitos) formatada (decorativa). */
export function gerarBoletoLinha(): string {
  const bloco = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  return `${bloco(5)}.${bloco(5)} ${bloco(5)}.${bloco(6)} ${bloco(5)}.${bloco(6)} ${bloco(1)} ${bloco(14)}`;
}
