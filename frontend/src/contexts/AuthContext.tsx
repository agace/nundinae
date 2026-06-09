import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { http, setToken } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string, tipo: User['tipo']) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nundinae.token');
    if (!token) { setLoading(false); return; }
    http.get<User>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, senha: string) {
    const res = await http.post<{ token: string; user: User }>('/auth/login', { email, senha });
    setToken(res.token);
    setUser(res.user);
  }

  async function register(nome: string, email: string, senha: string, tipo: User['tipo']) {
    const res = await http.post<{ token: string; user: User }>('/auth/register', {
      nome, email, senha, tipo,
    });
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    const me = await http.get<User>('/auth/me');
    setUser(me);
  }

  function updateUser(updated: User) {
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
