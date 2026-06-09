import { describe, it, expect } from 'vitest';
import { luhnValid, validateCard, formatCardNumber, formatExpiry, emptyCard, cpfValid, formatCpf } from './PaymentForms';

describe('Validação de cartão (checkout transparente)', () => {
  it('aceita um número que passa no Luhn e rejeita um inválido', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true);
    expect(luhnValid('1234 5678 9012 3456')).toBe(false);
  });

  it('formata o número em grupos de 4 e limita a 16 dígitos', () => {
    expect(formatCardNumber('4242424242424242999')).toBe('4242 4242 4242 4242');
  });

  it('formata a validade como MM/AA', () => {
    expect(formatExpiry('1230')).toBe('12/30');
  });

  it('validateCard retorna erro quando faltam dados', () => {
    expect(validateCard(emptyCard)).toBeTypeOf('string');
  });

  it('validateCard aprova um cartão completo e válido', () => {
    const erro = validateCard({
      numero: '4242 4242 4242 4242',
      nome: 'JULIA DOMNA',
      validade: '12/30',
      cvv: '123',
    });
    expect(erro).toBeNull();
  });

  it('validateCard rejeita validade vencida', () => {
    const erro = validateCard({
      numero: '4242 4242 4242 4242',
      nome: 'JULIA DOMNA',
      validade: '01/20',
      cvv: '123',
    });
    expect(erro).toMatch(/validade/i);
  });
});

describe('CPF (pagador do PIX real)', () => {
  it('aceita um CPF válido e rejeita inválidos', () => {
    expect(cpfValid('529.982.247-25')).toBe(true); // CPF de teste válido
    expect(cpfValid('111.111.111-11')).toBe(false); // dígitos repetidos
    expect(cpfValid('123.456.789-00')).toBe(false);
    expect(cpfValid('123')).toBe(false);
  });

  it('formata o CPF com pontos e traço', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});
