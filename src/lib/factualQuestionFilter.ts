// Frontend mirror of supabase/functions/_shared/factualQuestionFilter.ts
// Used to block creation of factual/biographical questions in the bank UI.

export const FACTUAL_LABELS = [
  "nome completo",
  "seu nome",
  "qual nome",
  "sobrenome",
  "telefone",
  "celular",
  "whatsapp",
  "numero de contato",
  "email",
  "e-mail",
  "idade",
  "quantos anos",
  "data de nascimento",
  "nascimento",
  "aniversario",
  "cidade",
  "onde voce mora",
  "onde mora",
  "de onde voce",
  "qual estado",
  "qual uf",
  "qual regiao",
];

const normalize = (s: string): string =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function isFactualQuestion(text: string): boolean {
  if (!text) return false;
  const n = normalize(text);
  return FACTUAL_LABELS.some((l) => n.includes(normalize(l)));
}

export const FACTUAL_QUESTION_BLOCK_MESSAGE =
  "Este dado já é coletado na biografia obrigatória do candidato e não pode virar pergunta de entrevista.";
