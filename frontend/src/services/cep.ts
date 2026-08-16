// Consulta de CEP pelo ViaCEP: gratuito, sem chave e com CORS liberado.

export interface CepAddress {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
}

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
  erro?: boolean;
}

export function cepDigits(cep: string): string {
  return cep.replace(/\D/g, '');
}

// Devolve null (nunca lança) para CEP inválido, inexistente ou consulta falha.
export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = cepDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro) return null;
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      estado: data.uf ?? '',
      complemento: data.complemento ?? '',
    };
  } catch {
    return null;
  }
}
