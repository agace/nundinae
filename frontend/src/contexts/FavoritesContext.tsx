import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { http } from '../services/api';
import { useAuth } from './AuthContext';

interface FavoritesContextValue {
  ids: Set<number>;
  isFavorite: (produtoId: number) => boolean;
  toggle: (produtoId: number) => Promise<boolean>;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());

  // Carrega (ou limpa) os favoritos quando o usuário entra/sai.
  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    http.get<number[]>('/favorites/ids')
      .then((list) => setIds(new Set(list)))
      .catch(() => setIds(new Set()));
  }, [user]);

  const isFavorite = useCallback((produtoId: number) => ids.has(produtoId), [ids]);

  const toggle = useCallback(async (produtoId: number): Promise<boolean> => {
    const jaEra = ids.has(produtoId);
    // Atualização otimista — reverte em caso de erro.
    setIds((prev) => {
      const next = new Set(prev);
      if (jaEra) next.delete(produtoId); else next.add(produtoId);
      return next;
    });
    try {
      if (jaEra) await http.delete(`/favorites/${produtoId}`);
      else await http.post(`/favorites/${produtoId}`);
      return !jaEra;
    } catch (err) {
      setIds((prev) => {
        const next = new Set(prev);
        if (jaEra) next.add(produtoId); else next.delete(produtoId);
        return next;
      });
      throw err;
    }
  }, [ids]);

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggle, count: ids.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
