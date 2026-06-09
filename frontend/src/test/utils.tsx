import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';

/** Envolve o componente nos providers reais (sem usuário logado por padrão). */
export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: AllProviders });
}
