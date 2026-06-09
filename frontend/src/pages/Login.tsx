import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ApiError } from '../services/api';

export function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, senha);
      toast('Bem-vindo de volta!', 'success');
      const to = (loc.state as { from?: string } | null)?.from ?? '/catalogo';
      nav(to);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao entrar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '3rem 1rem' }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>Bem-vindo</h1>
        <p className="muted mb-3" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          Entre na praça do mercado
        </p>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="field">
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-3" style={{ fontSize: '0.9rem' }}>
          Ainda não tem conta? <Link to="/registro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
