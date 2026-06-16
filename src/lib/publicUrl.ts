/**
 * Resolve the canonical public URL of the app.
 *
 * IMPORTANT: `window.location.origin` returns the preview iframe origin
 * (e.g. https://<id>.lovableproject.com) when the app is opened in the
 * Lovable editor. That host is not crawlable by Google and breaks every
 * external link (Google Jobs schema, careers page, ROI/portal links sent
 * by e-mail, etc.).
 *
 * Always use these helpers to build URLs that will be shared externally.
 */

const DEFAULT_PUBLIC_ORIGIN = "https://gentia.tech";

/**
 * Origem pública canônica do app — CONFIGURÁVEL por ambiente via `VITE_PUBLIC_ORIGIN`.
 *  - Produção (após migrar o domínio): defina `VITE_PUBLIC_ORIGIN=https://gentia.tech`.
 *  - Teste/preview do Lovable (antes de migrar): deixe VAZIO -> usa a origem ATUAL
 *    (o próprio domínio de teste), em vez de pular para gentia.tech hardcoded.
 * Sem override, usa `window.location.origin` em qualquer host real; só evita o iframe do
 * EDITOR do Lovable (*.lovableproject.com), que não é navegável/compartilhável.
 */
export function getPublicSiteUrl(): string {
  const override = (import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined)?.trim();
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (!host.endsWith(".lovableproject.com")) return window.location.origin;
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

export function getPublicJobUrl(jobId: string): string {
  return `${getPublicSiteUrl()}/vagas/${jobId}`;
}

export function getPublicCareersUrl(slug: string): string {
  return `${getPublicSiteUrl()}/c/${slug}`;
}

/**
 * URL pública da página de carreiras agregada por organização
 * (rota `/careers/:orgSlug`). Sempre aponta para o domínio canônico
 * (gentia.tech) em vez do host do Lovable.
 */
export function getPublicOrgCareersUrl(orgSlug: string): string {
  return `${getPublicSiteUrl()}/careers/${orgSlug}`;
}


export function getPublicReportUrl(token: string): string {
  return `${getPublicSiteUrl()}/relatorio/${token}`;
}

export function getPublicPortalUrl(token: string): string {
  return `${getPublicSiteUrl()}/portal/${token}`;
}

export function getPublicSatisfactionUrl(token: string): string {
  return `${getPublicSiteUrl()}/avaliacao/${token}`;
}
