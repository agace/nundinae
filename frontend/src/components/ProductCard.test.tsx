import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { renderWithProviders } from '../test/utils';
import type { Product } from '../types';

const produto: Product = {
  id: 7,
  vendedor_id: 2,
  vendedor_nome: 'Marcus Aurelius',
  vendedor_reputacao: 4.5,
  nome: 'Ânfora Romana',
  descricao: 'Peça artesanal',
  preco: 289.9,
  imagem: null,
  estoque: 5,
  categoria: 'Cerâmicas',
  ativo: true,
  created_at: '2026-01-01',
};

describe('ProductCard', () => {
  it('exibe nome, vendedor e preço formatado em reais', () => {
    renderWithProviders(<ProductCard product={produto} />);
    expect(screen.getByText('Ânfora Romana')).toBeInTheDocument();
    expect(screen.getByText(/Marcus Aurelius/)).toBeInTheDocument();
    expect(screen.getByText('R$ 289,90')).toBeInTheDocument();
  });

  it('mostra selo de últimas unidades quando estoque baixo', () => {
    renderWithProviders(<ProductCard product={{ ...produto, estoque: 2 }} />);
    expect(screen.getByText(/Últimas 2/)).toBeInTheDocument();
  });

  it('aponta o link para a página do produto', () => {
    renderWithProviders(<ProductCard product={produto} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/produto/7');
  });
});
