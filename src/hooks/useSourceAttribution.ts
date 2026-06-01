// Source and Medium mapping constants for the recruitment system

export const SOURCE_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook/Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referral", label: "Indicação" },
  { value: "hunting", label: "Hunting" },
  { value: "careers_page", label: "Página de Carreiras" },
  { value: "direct", label: "Direto/Manual" },
  { value: "jooble", label: "Jooble" },
  { value: "jora", label: "Jora" },
  { value: "catho", label: "Catho" },
  { value: "vagas_com", label: "Vagas.com.br" },
  { value: "infojobs", label: "InfoJobs" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "other", label: "Outro" },
] as const;

export const MEDIUM_OPTIONS = [
  { value: "organic", label: "Orgânico" },
  { value: "cpc", label: "CPC (Pago)" },
  { value: "job_board", label: "Portal de Vagas" },
  { value: "social", label: "Rede Social" },
  { value: "referral", label: "Indicação" },
  { value: "outbound", label: "Outbound (Hunting)" },
  { value: "direct", label: "Acesso Direto" },
  { value: "email", label: "Email" },
  { value: "other", label: "Outro" },
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  google: "Google",
  facebook: "Facebook/Instagram",
  whatsapp: "WhatsApp",
  referral: "Indicação",
  hunting: "Hunting",
  careers_page: "Página de Carreiras",
  direct: "Direto",
  jooble: "Jooble",
  jora: "Jora",
  catho: "Catho",
  vagas_com: "Vagas.com.br",
  infojobs: "InfoJobs",
  glassdoor: "Glassdoor",
  other: "Outro",
};

export const MEDIUM_LABELS: Record<string, string> = {
  organic: "Orgânico",
  cpc: "CPC (Pago)",
  job_board: "Portal de Vagas",
  social: "Rede Social",
  referral: "Indicação",
  outbound: "Outbound",
  direct: "Direto",
  email: "Email",
  other: "Outro",
};

export const SOURCE_COLORS: Record<string, string> = {
  linkedin: "hsl(210, 100%, 50%)",
  indeed: "hsl(210, 80%, 40%)",
  google: "hsl(142, 71%, 45%)",
  facebook: "hsl(220, 100%, 50%)",
  whatsapp: "hsl(142, 70%, 40%)",
  referral: "hsl(280, 70%, 50%)",
  hunting: "hsl(38, 92%, 50%)",
  careers_page: "hsl(var(--primary))",
  direct: "hsl(var(--muted-foreground))",
  jooble: "hsl(200, 80%, 45%)",
  jora: "hsl(350, 70%, 50%)",
  catho: "hsl(30, 90%, 50%)",
  vagas_com: "hsl(180, 70%, 40%)",
  infojobs: "hsl(0, 80%, 50%)",
  glassdoor: "hsl(120, 60%, 40%)",
  other: "hsl(var(--muted-foreground))",
};

// Get the label for a source value
export function getSourceLabel(source: string | null | undefined): string {
  if (!source) return "Desconhecido";
  return SOURCE_LABELS[source] || source;
}

// Get the label for a medium value
export function getMediumLabel(medium: string | null | undefined): string {
  if (!medium) return "Desconhecido";
  return MEDIUM_LABELS[medium] || medium;
}

// Get the color for a source value
export function getSourceColor(source: string | null | undefined): string {
  if (!source) return "hsl(var(--muted-foreground))";
  return SOURCE_COLORS[source] || SOURCE_COLORS.other;
}

// Determine the default medium for a given source
export function getDefaultMediumForSource(source: string): string {
  const mediumMap: Record<string, string> = {
    linkedin: "social",
    indeed: "job_board",
    google: "organic",
    facebook: "social",
    whatsapp: "social",
    referral: "referral",
    hunting: "outbound",
    careers_page: "direct",
    direct: "direct",
    jooble: "job_board",
    jora: "job_board",
    catho: "job_board",
    vagas_com: "job_board",
    infojobs: "job_board",
    glassdoor: "job_board",
    other: "other",
  };
  
  return mediumMap[source] || "other";
}
