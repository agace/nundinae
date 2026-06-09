import { AccountPanel } from '../components/AccountPanel';

export function Profile() {
  return (
    <div className="container" style={{ padding: '3rem 2rem 5rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', letterSpacing: '0.08em' }}>MEU PERFIL</h1>
        <p className="muted" style={{ marginTop: '0.4rem' }}>
          Gerencie sua foto, seus dados e seu endereço de entrega.
        </p>
      </div>
      <AccountPanel />
    </div>
  );
}
