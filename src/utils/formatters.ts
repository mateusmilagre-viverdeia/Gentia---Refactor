// Utilitários para formatação de valores monetários e numéricos

export const formatarMoeda = (valor: number | null | undefined): string => {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatarMoedaCompacta = (valor: number): string => {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`;
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(0)}K`;
  }
  return formatarMoeda(valor);
};

export const limparMoeda = (valor: string): number => {
  if (!valor) return 0;
  const apenasNumeros = valor.replace(/[^\d]/g, '');
  if (!apenasNumeros) return 0;
  return parseInt(apenasNumeros) / 100;
};

export const formatarMoedaInput = (valor: string): string => {
  if (!valor) return '';
  const apenasNumeros = valor.replace(/[^\d]/g, '');
  if (!apenasNumeros) return '';
  if (apenasNumeros === '0') return 'R$ 0,00';
  const numero = parseInt(apenasNumeros);
  const reais = numero / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatarNumero = (valor: number): string => {
  return valor.toLocaleString('pt-BR');
};

export const formatarPercentual = (valor: number, casasDecimais: number = 2): string => {
  return `${valor.toFixed(casasDecimais)}%`;
};

export const formatarNumeroInput = (valor: string): string => {
  return valor.replace(/[^\d]/g, '');
};

export const formatarDecimalInput = (valor: string): string => {
  return valor.replace(/[^\d.,]/g, '').replace(',', '.');
};
