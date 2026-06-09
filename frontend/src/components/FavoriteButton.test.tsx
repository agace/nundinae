import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';

const toggle = vi.fn().mockResolvedValue(true);
let favorito = false;

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, nome: 'Teste' } }) }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({ isFavorite: () => favorito, toggle }),
}));

function renderBtn() {
  return render(
    <MemoryRouter>
      <FavoriteButton produtoId={42} variant="inline" />
    </MemoryRouter>,
  );
}

describe('FavoriteButton', () => {
  beforeEach(() => { toggle.mockClear(); favorito = false; });

  it('mostra "Favoritar" quando não favoritado', () => {
    renderBtn();
    expect(screen.getByRole('button')).toHaveTextContent('Favoritar');
  });

  it('mostra "Favoritado" quando já favoritado', () => {
    favorito = true;
    renderBtn();
    expect(screen.getByRole('button')).toHaveTextContent('Favoritado');
  });

  it('chama toggle ao clicar', async () => {
    renderBtn();
    await userEvent.click(screen.getByRole('button'));
    expect(toggle).toHaveBeenCalledWith(42);
  });
});
