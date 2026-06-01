/**
 * Extrai as descrições de competências comportamentais do bloco
 * "Nosso Santo Vai Bater Se Você" da página "Vendendo a Empresa".
 * 
 * Retorna os bullet points (descrições), não os títulos das competências.
 * Ex: "Cumpre as regras e procedimentos internos da empresa"
 */
export function extractBehavioralCompetencies(sellingContent: string): string[] {
  if (!sellingContent || sellingContent.trim().length === 0) {
    return [];
  }

  // Encontrar o bloco "Nosso Santo Vai Bater Se Você" (com variações de emoji e texto)
  const blockMatch = sellingContent.match(
    /(?:##\s*)?(?:🤝\s*)?(?:\d+\.\s*)?Nosso Santo Vai Bater Se[\s\S]*?(?=(?:##\s*(?:🎁|📍|\d+\.))|$)/i
  );

  if (!blockMatch) {
    return [];
  }

  const blockContent = blockMatch[0];
  const competencies: string[] = [];

  // Extrair os bullet points (*) que são as descrições das competências
  // Formato: *   Cumpre as regras e procedimentos internos da empresa **sem exceção**.
  const bulletPattern = /\*\s+([^*\n][^\n]+)/g;
  let match;

  while ((match = bulletPattern.exec(blockContent)) !== null) {
    // Limpar texto: remover ** de ênfase e espaços extras
    let text = match[1]
      .replace(/\*\*/g, '') // Remove **texto**
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    // Ignora textos muito curtos ou que parecem títulos
    if (text.length > 15 && !text.startsWith('👉')) {
      competencies.push(text);
    }
  }

  return competencies;
}
