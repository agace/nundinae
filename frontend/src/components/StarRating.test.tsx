import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('renderiza max estrelas', () => {
    render(<StarRating value={3} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('mostra o valor numérico quando showValue', () => {
    render(<StarRating value={4.2} showValue />);
    expect(screen.getByText('4.2')).toBeInTheDocument();
  });

  it('mostra travessão quando a nota é zero', () => {
    render(<StarRating value={0} showValue />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('dispara onChange com a estrela clicada', async () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('4 estrelas'));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
