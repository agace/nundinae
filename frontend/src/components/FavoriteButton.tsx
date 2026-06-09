import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconHeart } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useToast } from '../contexts/ToastContext';

interface Props {
  produtoId: number;
  size?: number;
  /** 'floating' = botão circular (sobre a imagem do card); 'inline' = com texto. */
  variant?: 'floating' | 'inline';
}

export function FavoriteButton({ produtoId, size = 18, variant = 'floating' }: Props) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { toast } = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const fav = isFavorite(produtoId);

  async function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { nav('/login'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const agora = await toggle(produtoId);
      toast(agora ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success');
    } catch {
      toast('Não foi possível atualizar os favoritos', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        className={fav ? 'btn btn-primary' : 'btn btn-outline'}
        style={{ gap: '0.5rem' }}
        aria-pressed={fav}
        aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <IconHeart size={size} filled={fav} />
        {fav ? 'Favoritado' : 'Favoritar'}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={fav}
      aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '2.4rem', height: '2.4rem', borderRadius: '50%',
        background: 'rgba(42, 8, 17, 0.7)',
        backdropFilter: 'blur(6px)',
        border: '1px solid var(--border-subtle)',
        color: fav ? 'var(--wine-300)' : 'var(--cream-100)',
        transition: 'transform 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <IconHeart size={size} filled={fav} />
    </button>
  );
}
