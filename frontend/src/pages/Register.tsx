import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ApiError } from '../services/api';
import type { UserType } from '../types';

export function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState<UserType>('ambos');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(nome, email, senha, tipo);
      toast('Conta criada. Bem-vindo ao Nundinae.', 'success');
      nav('/catalogo');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao cadastrar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '3rem 1rem' }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>Junte-se ao Mercado</h1>
        <p className="muted mb-3" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          Crie sua conta em segundos
        </p>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="label">Nome completo</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
          </div>
          <div className="field">
            <label className="label">E-mail</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Senha</label>
            <input type="password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
          </div>
          <div className="field">
            <label className="label">Eu quero</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {([
                { v: 'comprador', l: 'Comprar' },
                { v: 'vendedor', l: 'Vender' },
                { v: 'ambos', l: 'Ambos' },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setTipo(opt.v)}
                  className={tipo === opt.v ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ padding: '0.85rem', fontSize: '0.8rem' }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Criando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center mt-3" style={{ fontSize: '0.9rem' }}>
          Já tem conta? <Link to="/login">Entre aqui</Link>
        </p>
      </div>
    </div>
  );
}
