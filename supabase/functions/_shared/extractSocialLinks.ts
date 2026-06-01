// Helper compartilhado para extrair/normalizar redes sociais de candidatos de hunting.
// Estrutura padrão usada em recruitment_hunting_results.extracted_data.social_links

export type SocialLinks = {
  linkedin?: string;
  instagram?: string;
  github?: string;
  twitter?: string;
  website?: string;
};

const PATTERNS: Array<{ key: keyof SocialLinks; regex: RegExp; normalize?: (m: string) => string }> = [
  { key: 'linkedin', regex: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%.]+\/?/i },
  { key: 'instagram', regex: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?/i },
  { key: 'github', regex: /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9\-_]+\/?/i },
  { key: 'twitter', regex: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/?/i },
];

function clean(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/**
 * Mescla candidatos de redes sociais. Mantém valor preexistente quando o novo é vazio.
 */
export function mergeSocialLinks(
  existing?: SocialLinks | null,
  incoming?: Partial<SocialLinks> | null
): SocialLinks {
  const out: SocialLinks = { ...(existing ?? {}) };
  if (!incoming) return out;
  for (const k of Object.keys(incoming) as Array<keyof SocialLinks>) {
    const v = clean(incoming[k] as string | undefined);
    if (v && !out[k]) out[k] = v;
  }
  return out;
}

/**
 * Extrai redes sociais a partir de campos comuns de payloads (Apollo, scrapers, texto livre).
 */
export function extractSocialLinks(input: Record<string, unknown> | null | undefined): SocialLinks {
  if (!input) return {};
  const out: SocialLinks = {};

  // Campos diretos
  out.linkedin = clean(input.linkedin_url as string ?? input.linkedin as string);
  out.instagram = clean(input.instagram_url as string ?? input.instagram as string);
  out.github = clean(input.github_url as string ?? input.github as string);
  out.twitter = clean(input.twitter_url as string ?? input.x_url as string ?? input.twitter as string);
  out.website = clean(input.website as string ?? input.personal_website as string ?? input.blog_url as string);

  // Username instagram → URL
  const igData = input.instagram_data as { username?: string } | undefined;
  if (!out.instagram && igData?.username) {
    out.instagram = `https://instagram.com/${igData.username.replace(/^@/, '')}`;
  }

  // Varredura de texto livre (headline, summary, bio)
  const textBlob = [input.headline, input.summary, input.bio, input.about, input.description]
    .filter(Boolean)
    .join('\n');
  if (textBlob) {
    for (const { key, regex } of PATTERNS) {
      if (out[key]) continue;
      const m = textBlob.match(regex);
      if (m) out[key] = clean(m[0]);
    }
  }

  // Limpa keys undefined
  return Object.fromEntries(Object.entries(out).filter(([, v]) => !!v)) as SocialLinks;
}
