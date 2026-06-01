export const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo de 8 caracteres', test: (p: string) => p.length >= 8 },
  { id: 'lower', label: 'Pelo menos 1 letra minúscula (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Pelo menos 1 letra maiúscula (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'number', label: 'Pelo menos 1 número (0-9)', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'Pelo menos 1 caractere especial (!@#$%...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export interface PasswordValidationResult {
  valid: boolean;
  failed: typeof PASSWORD_RULES[number][];
}

export function validatePassword(p: string): PasswordValidationResult {
  const failed = PASSWORD_RULES.filter(r => !r.test(p));
  return { valid: failed.length === 0, failed };
}

export function firstFailureMessage(p: string): string | null {
  const { failed } = validatePassword(p);
  return failed.length ? failed[0].label : null;
}

export function translatePasswordError(message?: string | null): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes('should be at least') || m.includes('at least 6') || m.includes('at least 8'))
    return 'A senha é muito curta (mínimo 8 caracteres).';
  if (m.includes('lower case') || m.includes('lowercase'))
    return 'A senha precisa ter ao menos uma letra minúscula.';
  if (m.includes('upper case') || m.includes('uppercase'))
    return 'A senha precisa ter ao menos uma letra maiúscula.';
  if (m.includes('digit') || m.includes('number'))
    return 'A senha precisa ter ao menos um número.';
  if (m.includes('symbol') || m.includes('special'))
    return 'A senha precisa ter ao menos um caractere especial (ex.: !@#$%).';
  if (m.includes('pwned') || m.includes('compromised') || m.includes('leaked') || m.includes('breach'))
    return 'Esta senha apareceu em vazamentos públicos. Escolha uma senha diferente.';
  if (m.includes('password') && (m.includes('weak') || m.includes('strength')))
    return 'Senha muito fraca. Use letras maiúsculas, minúsculas, números e símbolos.';
  if (m.includes('same as') || m.includes('different from the old'))
    return 'A nova senha precisa ser diferente da anterior.';
  return null;
}
