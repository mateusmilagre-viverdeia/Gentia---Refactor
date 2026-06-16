/**
 * Redireciona hosts do Lovable (preview e published) para o domínio
 * canônico `gentia.tech` quando o usuário cai em uma rota pública
 * (carreiras, vagas, relatórios externos).
 *
 * Por quê: links como `https://gentia.lovable.app/careers/ep-partners`
 * ou `https://<id>.lovableproject.com/careers/ep-partners` ficam
 * indexáveis e podem ser compartilhados por engano. Queremos que tudo
 * que é público apareça sob `gentia.tech`.
 *
 * Cuidados:
 *  - Nunca redirecionar quando rodando dentro de um iframe (editor do
 *    Lovable mostra o preview num iframe — redirecionar quebraria o
 *    editor).
 *  - Nunca redirecionar quando a página NÃO é uma rota pública (auth,
 *    app interno, etc. continuam funcionando no preview).
 */

const LOVABLE_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com"];

const PUBLIC_PATH_PREFIXES = [
  "/careers/",
  "/c/",
  "/vagas/",
];

export function redirectToCanonicalHost(): void {
  if (typeof window === "undefined") return;

  // Domínio canônico CONFIGURÁVEL por ambiente (VITE_PUBLIC_ORIGIN). Sem ele — ex.: testando
  // no domínio publicado do Lovable ANTES de migrar — NÃO redireciona: tudo fica no domínio
  // atual (evita o "pulo" para gentia.tech durante os testes). Defina como https://gentia.tech
  // só quando o domínio de produção estiver no ar.
  const canonical = (import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined)
    ?.trim()
    ?.replace(/\/+$/, "");
  if (!canonical) return;

  // Não redireciona dentro do editor (iframe do Lovable).
  try {
    if (window.self !== window.top) return;
  } catch {
    // cross-origin frame → também é editor; não redirecionar
    return;
  }

  // Já está no domínio canônico? nada a fazer (evita loop).
  if (window.location.origin === canonical) return;

  const host = window.location.hostname.toLowerCase();
  const isLovableHost = LOVABLE_HOST_SUFFIXES.some((suffix) =>
    host.endsWith(suffix),
  );
  if (!isLovableHost) return;

  const path = window.location.pathname;
  const isPublicRoute = PUBLIC_PATH_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );
  if (!isPublicRoute) return;

  const target = `${canonical}${path}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
}
