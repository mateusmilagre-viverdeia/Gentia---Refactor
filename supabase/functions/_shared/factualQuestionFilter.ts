// Shared filter to remove biographical / factual questions from interview
// question lists. These data points are already collected on the mandatory
// candidate biography (candidate_profiles + auth.users.email) and the AI
// already has them in context, so they MUST NOT be asked during voice
// interviews.

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

export function filterFactualQuestions<T>(
  questions: T[],
  getText: (q: T) => string,
): { kept: T[]; removed: T[] } {
  const kept: T[] = [];
  const removed: T[] = [];
  for (const q of questions) {
    if (isFactualQuestion(getText(q))) removed.push(q);
    else kept.push(q);
  }
  return { kept, removed };
}
