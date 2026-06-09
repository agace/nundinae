import { useRef, useState, type FormEvent } from 'react';
import { http, ApiError } from '../services/api';
import { fetchAddressByCep, cepDigits } from '../services/cep';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { User } from '../types';

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

/** Painel de conta reutilizável: foto, dados, endereço e troca de senha.
 *  Usado tanto na página /perfil quanto na aba "Minha Conta" do admin. */
export function AccountPanel() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: user?.nome ?? '',
    telefone: user?.telefone ?? '',
    bio: user?.bio ?? '',
    endereco_cep: user?.endereco_cep ?? '',
    endereco_logradouro: user?.endereco_logradouro ?? '',
    endereco_numero: user?.endereco_numero ?? '',
    endereco_complemento: user?.endereco_complemento ?? '',
    endereco_bairro: user?.endereco_bairro ?? '',
    endereco_cidade: user?.endereco_cidade ?? '',
    endereco_estado: user?.endereco_estado ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [senhas, setSenhas] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  if (!user) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onCepChange(value: string) {
    set('endereco_cep', value);
    if (cepDigits(value).length !== 8) return;
    setCepLoading(true);
    const addr = await fetchAddressByCep(value);
    setCepLoading(false);
    if (!addr) {
      toast('CEP não encontrado.', 'info');
      return;
    }
    setForm((f) => ({
      ...f,
      endereco_logradouro: addr.logradouro || f.endereco_logradouro,
      endereco_bairro: addr.bairro || f.endereco_bairro,
      endereco_cidade: addr.cidade || f.endereco_cidade,
      endereco_estado: addr.estado || f.endereco_estado,
    }));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Selecione um arquivo de imagem.', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { avatar_url } = await http.upload<{ avatar_url: string }>('/users/me/avatar', fd);
      updateUser({ ...user, avatar_url } as User);
      toast('Foto de perfil atualizada.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao enviar a foto', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!user?.avatar_url) return;
    setRemovingAvatar(true);
    try {
      await http.delete('/users/me/avatar');
      updateUser({ ...user, avatar_url: null } as User);
      toast('Foto de perfil removida.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao remover a foto', 'error');
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await http.put<User>('/users/me', form);
      updateUser(updated);
      toast('Dados atualizados com sucesso.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (senhas.nova_senha !== senhas.confirmar) {
      toast('A confirmação não corresponde à nova senha.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await http.put('/users/me/password', {
        senha_atual: senhas.senha_atual,
        nova_senha: senhas.nova_senha,
      });
      setSenhas({ senha_atual: '', nova_senha: '', confirmar: '' });
      toast('Senha alterada com sucesso.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erro ao trocar a senha', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="stack gap-3" style={{ maxWidth: '760px', width: '100%', margin: '0 auto' }}>
      {/* Avatar + identidade */}
      <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '5.5rem', height: '5.5rem', borderRadius: '50%',
          overflow: 'hidden', flexShrink: 0,
          border: '2px solid var(--gold-500)',
          background: 'linear-gradient(135deg, var(--gold-500), var(--gold-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--wine-900)', fontWeight: 700, fontSize: '2rem',
          fontFamily: 'var(--font-display)',
        }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.nome.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{user.nome}</div>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{user.email}</div>
          <span className="badge badge-gold" style={{ marginTop: '0.5rem' }}>{user.tipo}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} />
          <button className="btn btn-outline" disabled={uploading || removingAvatar} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Enviando...' : 'Trocar foto'}
          </button>
          {user.avatar_url && (
            <button className="btn btn-danger" disabled={uploading || removingAvatar} onClick={removeAvatar} style={{ fontSize: '0.72rem', padding: '0.5rem 1rem' }}>
              {removingAvatar ? 'Removendo...' : 'Remover foto'}
            </button>
          )}
        </div>
      </div>

      {/* Dados + endereço */}
      <form className="card" style={{ padding: '2rem' }} onSubmit={saveProfile}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Dados pessoais</h2>

        <div className="field">
          <label className="label">Nome</label>
          <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} required minLength={2} maxLength={100} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Telefone</label>
            <input className="input" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} maxLength={20} placeholder="(00) 00000-0000" />
          </div>
          <div className="field">
            <label className="label">E-mail</label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
        <div className="field">
          <label className="label">Bio</label>
          <textarea className="input" value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={280} rows={3} placeholder="Conte um pouco sobre você ou sua loja..." style={{ resize: 'vertical' }} />
        </div>

        <h2 style={{ fontSize: '1.15rem', margin: '0.5rem 0 1.5rem' }}>Endereço</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">CEP {cepLoading && <span className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· buscando...</span>}</label>
            <input className="input" value={form.endereco_cep} onChange={(e) => onCepChange(e.target.value)} maxLength={9} placeholder="00000-000" inputMode="numeric" />
          </div>
          <div className="field">
            <label className="label">Rua</label>
            <input className="input" value={form.endereco_logradouro} onChange={(e) => set('endereco_logradouro', e.target.value)} maxLength={150} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Número</label>
            <input className="input" value={form.endereco_numero} onChange={(e) => set('endereco_numero', e.target.value)} maxLength={20} />
          </div>
          <div className="field">
            <label className="label">Complemento</label>
            <input className="input" value={form.endereco_complemento} onChange={(e) => set('endereco_complemento', e.target.value)} maxLength={100} placeholder="Apto, bloco, ponto de referência..." />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Bairro</label>
            <input className="input" value={form.endereco_bairro} onChange={(e) => set('endereco_bairro', e.target.value)} maxLength={100} />
          </div>
          <div className="field">
            <label className="label">Cidade</label>
            <input className="input" value={form.endereco_cidade} onChange={(e) => set('endereco_cidade', e.target.value)} maxLength={100} />
          </div>
          <div className="field">
            <label className="label">UF</label>
            <select className="input" value={form.endereco_estado} onChange={(e) => set('endereco_estado', e.target.value)}>
              <option value="">—</option>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={savingProfile} style={{ marginTop: '0.5rem' }}>
          {savingProfile ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* Troca de senha */}
      <form className="card" style={{ padding: '2rem' }} onSubmit={savePassword}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Segurança</h2>
        <div className="field">
          <label className="label">Senha atual</label>
          <input className="input" type="password" value={senhas.senha_atual} onChange={(e) => setSenhas((s) => ({ ...s, senha_atual: e.target.value }))} required autoComplete="current-password" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label className="label">Nova senha</label>
            <input className="input" type="password" value={senhas.nova_senha} onChange={(e) => setSenhas((s) => ({ ...s, nova_senha: e.target.value }))} required minLength={6} autoComplete="new-password" />
          </div>
          <div className="field">
            <label className="label">Confirmar nova senha</label>
            <input className="input" type="password" value={senhas.confirmar} onChange={(e) => setSenhas((s) => ({ ...s, confirmar: e.target.value }))} required minLength={6} autoComplete="new-password" />
          </div>
        </div>
        <button className="btn btn-ghost" type="submit" disabled={savingPassword}>
          {savingPassword ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </div>
  );
}
