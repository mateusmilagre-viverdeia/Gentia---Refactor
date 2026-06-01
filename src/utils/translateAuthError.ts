const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a ação. Tente novamente em instantes.";

const errorMap: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos.",
  "User already registered": "Este email já está cadastrado.",
  "Email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada.",
  "Signup requires a valid password": "Informe uma senha válida.",
  "Email rate limit exceeded": "Muitas tentativas. Aguarde antes de tentar novamente.",
  "User not found": "Usuário não encontrado.",
  "New password should be different from the old password.": "A nova senha deve ser diferente da anterior.",
  "Token has expired or is invalid": "Link expirado ou inválido. Solicite um novo.",
  "Failed to fetch": "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  "NetworkError": "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  "Load failed": "Não foi possível carregar os dados. Tente novamente.",
  "JWT expired": "Sua sessão expirou. Faça login novamente.",
  "Invalid JWT": "Sessão inválida. Faça login novamente.",
  "Edge Function returned a non-2xx status code": "Não foi possível concluir a operação no servidor. Tente novamente.",
  "FunctionsHttpError: Edge Function returned a non-2xx status code": "Não foi possível concluir a operação no servidor. Tente novamente.",
  "Unauthorized": "Você não tem permissão para realizar esta ação.",
  "Forbidden": "Acesso negado para esta ação.",
  "Not Found": "Registro não encontrado.",
  "duplicate key value violates unique constraint": "Já existe um registro com estes dados.",
};

const partialMatches: Array<{ pattern: string; translation: string }> = [
  { pattern: "Password should be at least", translation: "A senha é muito curta. Use no mínimo 8 caracteres." },
  { pattern: "password is too short", translation: "A senha é muito curta. Use no mínimo 8 caracteres." },
  { pattern: "at least 8", translation: "A senha é muito curta. Use no mínimo 8 caracteres." },
  { pattern: "password should contain at least one character of each", translation: "A senha precisa conter letra maiúscula, minúscula, número e caractere especial." },
  { pattern: "password should contain", translation: "A senha precisa conter letra maiúscula, minúscula, número e caractere especial." },
  { pattern: "lower case", translation: "A senha precisa ter ao menos uma letra minúscula." },
  { pattern: "upper case", translation: "A senha precisa ter ao menos uma letra maiúscula." },
  { pattern: "weak_password", translation: "Senha fraca. Use letras maiúsculas, minúsculas, números e caracteres especiais (mínimo 8)." },
  { pattern: "weak password", translation: "Senha fraca. Use letras maiúsculas, minúsculas, números e caracteres especiais (mínimo 8)." },
  { pattern: "pwned", translation: "Esta senha apareceu em vazamentos públicos. Escolha uma senha diferente." },
  { pattern: "compromised", translation: "Esta senha apareceu em vazamentos públicos. Escolha uma senha diferente." },
  { pattern: "For security purposes", translation: "Aguarde um momento antes de tentar novamente." },
  { pattern: "over_email_send_rate_limit", translation: "Muitas tentativas de envio de email. Aguarde antes de tentar novamente." },
  { pattern: "rate limit", translation: "Muitas tentativas. Aguarde antes de tentar novamente." },
  { pattern: "invalid login", translation: "Email ou senha incorretos." },
  { pattern: "email not confirmed", translation: "Email ainda não confirmado. Verifique sua caixa de entrada." },
  { pattern: "already registered", translation: "Este email já está cadastrado." },
  { pattern: "token has expired", translation: "Link expirado ou inválido. Solicite um novo." },
  { pattern: "expired", translation: "O prazo expirou. Tente novamente." },
  { pattern: "jwt", translation: "Sua sessão expirou. Faça login novamente." },
  { pattern: "unauthorized", translation: "Você não tem permissão para realizar esta ação." },
  { pattern: "forbidden", translation: "Acesso negado para esta ação." },
  { pattern: "permission denied", translation: "Você não tem permissão para acessar este recurso." },
  { pattern: "row-level security", translation: "Você não tem permissão para salvar ou acessar estes dados." },
  { pattern: "violates row-level security policy", translation: "Você não tem permissão para salvar ou acessar estes dados." },
  { pattern: "duplicate key", translation: "Já existe um registro com estes dados." },
  { pattern: "unique constraint", translation: "Já existe um registro com estes dados." },
  { pattern: "foreign key constraint", translation: "Não foi possível salvar porque há dados relacionados ausentes ou inválidos." },
  { pattern: "not-null constraint", translation: "Preencha todos os campos obrigatórios." },
  { pattern: "invalid input syntax", translation: "Algum dado informado está em formato inválido." },
  { pattern: "failed to fetch", translation: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." },
  { pattern: "networkerror", translation: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." },
  { pattern: "network request failed", translation: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." },
  { pattern: "timeout", translation: "A operação demorou demais. Tente novamente." },
  { pattern: "non-2xx status", translation: "Não foi possível concluir a operação no servidor. Tente novamente." },
  { pattern: "function returned", translation: "Não foi possível concluir a operação no servidor. Tente novamente." },
  { pattern: "storage", translation: "Não foi possível acessar o arquivo. Tente novamente." },
  { pattern: "file too large", translation: "O arquivo é muito grande." },
  { pattern: "invalid mime type", translation: "Tipo de arquivo inválido." },
  { pattern: "rate_limit_exceeded", translation: "Limite diário atingido. Tente novamente amanhã." },
  { pattern: "payment_required", translation: "Créditos esgotados para esta operação." },
  { pattern: "insufficient", translation: "Saldo ou permissão insuficiente para concluir esta ação." },
];

function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const code = (error as any).code;
    return code ? `${error.message} ${code}` : error.message;
  }
  if (typeof error === "object") {
    const candidate = error as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.error, candidate.details, candidate.hint, candidate.code]
      .filter(Boolean)
      .map(String);
    return parts.join(" ") || "";
  }
  return String(error);
}

function looksPortuguese(message: string): boolean {
  return /[áàâãéêíóôõúç]|\b(não|erro|senha|email|usuário|acesso|tente|verifique|inválido|obrigatório)\b/i.test(message);
}

function looksTechnicalOrEnglish(message: string): boolean {
  return /[a-z]/i.test(message) && /\b(error|failed|invalid|unauthorized|forbidden|expired|violates|constraint|policy|network|fetch|jwt|timeout|function|storage|duplicate|not found|user|password|email)\b/i.test(message);
}

export function getTranslatedErrorMessage(error: unknown, fallbackMessage = DEFAULT_ERROR_MESSAGE): string {
  const message = extractErrorMessage(error).trim();
  if (!message) return fallbackMessage;

  if (errorMap[message]) return errorMap[message];

  const lower = message.toLowerCase();
  for (const { pattern, translation } of partialMatches) {
    if (lower.includes(pattern.toLowerCase())) return translation;
  }

  if (looksPortuguese(message)) return message;
  if (looksTechnicalOrEnglish(message)) return fallbackMessage;

  return message;
}

export function translateAuthError(error: unknown): string {
  return getTranslatedErrorMessage(error, "Erro inesperado. Tente novamente.");
}
