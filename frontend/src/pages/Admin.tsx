import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { http, ApiError } from '../services/api';
import type { AdminUser, AdminStats, AdminProduct, UserType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { money } from '../utils/format';

const TIPOS: UserType[] = ['comprador', 'vendedor', 'ambos', 'admin'];
type Tab = 'usuarios' | 'produtos';

export function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminProduct | null>(null);

  useEffect(() => { if (user?.tipo === 'admin') load(); }, [user]);

  if (user && user.tipo !== 'admin') {
    return <Navigate to="/" replace />;
  }

  async function load() {
    setLoading(true);
    try {
      const [u, p, s] = await Promise.all([
        http.get<AdminUser[]>('/admin/users'),
        http.get<AdminProduct[]>('/admin/products'),
        http.get<AdminStats>('/admin/stats'),
      ]);
      setUsers(u);
      setProducts(p);
      setStats(s);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(u: AdminUser) {
    try {
      await http.patch(`/admin/users/${u.id}/status`, { ativo: !u.ativo });
      toast(u.ativo ? 'Usuário bloqueado' : 'Usuário reativado', 'success');
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    }
  }

  async function changeTipo(u: AdminUser, tipo: UserType) {
    try {
      await http.patch(`/admin/users/${u.id}/tipo`, { tipo });
      toast('Papel atualizado', 'success');
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Excluir definitivamente "${u.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await http.delete(`/admin/users/${u.id}`);
      toast('Usuário excluído', 'success');
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    }
  }

  async function toggleProductAtivo(p: AdminProduct) {
    try {
      if (p.ativo) {
        await http.delete(`/products/${p.id}`);
        toast('Produto desativado', 'success');
      } else {
        await http.put(`/products/${p.id}`, { ativo: true });
        toast('Produto reativado', 'success');
      }
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro', 'error');
    }
  }

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em' }}>PAINEL DO ADMINISTRADOR</h1>
        <p className="muted" style={{ marginTop: '0.4rem' }}>
          Gerenciamento de usuários e produtos da feira.
        </p>
      </div>

      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <StatCard label="Usuários" value={String(stats.usuarios)} />
          <StatCard label="Bloqueados" value={String(stats.usuarios_bloqueados)} />
          <StatCard label="Produtos ativos" value={String(stats.produtos)} />
          <StatCard label="Produtos inativos" value={String(stats.produtos_inativos)} />
          <StatCard label="Pedidos pagos" value={String(stats.pedidos_pagos)} />
          <StatCard label="Faturamento" value={`${money(stats.faturamento)}`} />
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <TabButton active={tab === 'usuarios'} onClick={() => setTab('usuarios')}>Usuários</TabButton>
        <TabButton active={tab === 'produtos'} onClick={() => setTab('produtos')}>Produtos</TabButton>
      </div>

      {tab === 'usuarios' && (
        loading ? <Spinner /> : (
          <div className="card" style={{ padding: '0', overflow: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Produtos</th>
                  <th style={{ textAlign: 'center' }}>Pedidos</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.55 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.nome}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{u.email}</div>
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
                        value={u.tipo}
                        disabled={u.id === user.id}
                        onChange={(e) => changeTipo(u, e.target.value as UserType)}
                      >
                        {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td>
                      <StatusBadge ok={u.ativo} okLabel="Ativo" offLabel="Bloqueado" />
                    </td>
                    <td style={{ textAlign: 'center' }}>{u.total_produtos}</td>
                    <td style={{ textAlign: 'center' }}>{u.total_pedidos}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {u.id === user.id ? (
                        <span className="muted" style={{ fontSize: '0.75rem' }}>você</span>
                      ) : u.tipo === 'admin' ? (
                        <span className="muted" style={{ fontSize: '0.75rem' }}>protegido</span>
                      ) : (
                        <>
                          <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem', marginRight: '0.4rem' }} onClick={() => toggleAtivo(u)}>
                            {u.ativo ? 'Bloquear' : 'Reativar'}
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem' }} onClick={() => remove(u)}>
                            Excluir
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'produtos' && (
        loading ? <Spinner /> : (
          <div className="card" style={{ padding: '0', overflow: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Vendedor</th>
                  <th style={{ textAlign: 'right' }}>Preço</th>
                  <th style={{ textAlign: 'center' }}>Estoque</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ opacity: p.ativo ? 1 : 0.55 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.nome}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{p.categoria}</div>
                    </td>
                    <td>{p.vendedor_nome}</td>
                    <td style={{ textAlign: 'right' }}>{money(p.preco)}</td>
                    <td style={{ textAlign: 'center' }}>{p.estoque}</td>
                    <td><StatusBadge ok={p.ativo} okLabel="Ativo" offLabel="Inativo" /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem', marginRight: '0.4rem' }} onClick={() => setEditing(p)}>
                        Editar
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem' }} onClick={() => toggleProductAtivo(p)}>
                        {p.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum produto cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {editing && (
        <ProductEditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <style>{`
        .admin-table th {
          text-align: left;
          padding: 0.9rem 1.1rem;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold-400);
          border-bottom: 1px solid var(--border-subtle);
        }
        .admin-table td {
          padding: 0.85rem 1.1rem;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
        }
        .admin-table tbody tr:last-child td { border-bottom: none; }
        .admin-table tbody tr:hover { background: rgba(212,164,58,0.04); }
      `}</style>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={active ? 'btn btn-primary' : 'btn btn-ghost'}
      style={{ padding: '0.6rem 1.4rem', fontSize: '0.78rem' }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return <div style={{ display: 'grid', placeItems: 'center', padding: '4rem' }}><div className="spinner" /></div>;
}

function StatusBadge({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return (
    <span style={{
      padding: '0.2rem 0.7rem',
      borderRadius: 'var(--radius-pill)',
      fontSize: '0.72rem',
      fontWeight: 600,
      background: ok ? 'rgba(76,175,80,0.15)' : 'rgba(198,40,40,0.18)',
      color: ok ? '#7bd17f' : '#ef9a9a',
      border: `1px solid ${ok ? 'rgba(76,175,80,0.4)' : 'rgba(198,40,40,0.4)'}`,
    }}>
      {ok ? okLabel : offLabel}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
      <div className="muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div className="gold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, marginTop: '0.3rem' }}>{value}</div>
    </div>
  );
}

function ProductEditModal({ product, onClose, onSaved }: { product: AdminProduct; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    nome: product.nome,
    preco: String(product.preco),
    estoque: String(product.estoque),
    categoria: product.categoria,
    imagem: product.imagem ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Selecione um arquivo de imagem.', 'error');
      return;
    }
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('imagem', file);
      const { url } = await http.upload<{ url: string }>('/products/image', fd);
      setForm((f) => ({ ...f, imagem: url }));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao enviar a imagem', 'error');
    } finally {
      setUploadingImg(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await http.put(`/products/${product.id}`, {
        nome: form.nome,
        preco: Number(form.preco),
        estoque: Number(form.estoque),
        categoria: form.categoria,
        imagem: form.imagem.trim() || null,
      });
      toast('Produto atualizado', 'success');
      onSaved();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error');
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center', padding: '1.5rem',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="card fade-up"
        style={{ padding: '2rem', width: '100%', maxWidth: '520px', background: 'var(--bg-main)' }}
      >
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Editar produto</h2>
        <div className="field">
          <label className="label">Nome</label>
          <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required minLength={2} maxLength={200} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Preço (R$)</label>
            <input className="input" type="number" step="0.01" min="0.01" value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} required />
          </div>
          <div className="field">
            <label className="label">Estoque</label>
            <input className="input" type="number" min="0" value={form.estoque} onChange={(e) => setForm((f) => ({ ...f, estoque: e.target.value }))} required />
          </div>
        </div>
        <div className="field">
          <label className="label">Categoria</label>
          <input className="input" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} required maxLength={100} />
        </div>
        <div className="field">
          <label className="label">Imagem do produto</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '88px', height: '88px', borderRadius: '10px', flexShrink: 0,
              border: '1px solid var(--border-subtle)',
              background: form.imagem ? `url(${form.imagem}) center/cover` : 'linear-gradient(135deg, var(--wine-700), var(--wine-900))',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
              <button type="button" className="btn btn-outline" disabled={uploadingImg} onClick={() => fileRef.current?.click()}>
                {uploadingImg ? 'Enviando...' : form.imagem ? 'Trocar imagem' : 'Enviar imagem'}
              </button>
              {form.imagem && (
                <button type="button" className="btn btn-danger" disabled={uploadingImg} onClick={() => setForm((f) => ({ ...f, imagem: '' }))} style={{ fontSize: '0.72rem', padding: '0.5rem 1rem' }}>
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}
