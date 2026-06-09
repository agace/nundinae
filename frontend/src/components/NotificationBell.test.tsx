import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

const get = vi.fn();
vi.mock('../services/api', () => ({ http: { get: (...a: unknown[]) => get(...a) } }));

function renderBell() {
  return render(<MemoryRouter><NotificationBell /></MemoryRouter>);
}

describe('NotificationBell', () => {
  it('mostra o badge com o total de não lidas', async () => {
    get.mockResolvedValue({
      nao_lidas: 3,
      items: [{ id: 1, tipo: 'venda', titulo: 'Você vendeu', mensagem: null, link: '/vendas', lida: false, created_at: new Date().toISOString() }],
    });
    renderBell();
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
  });

  it('não mostra badge quando não há não lidas', async () => {
    get.mockResolvedValue({ nao_lidas: 0, items: [] });
    renderBell();
    await waitFor(() => expect(get).toHaveBeenCalledWith('/notifications'));
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
