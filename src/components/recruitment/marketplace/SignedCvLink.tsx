import type { ReactNode } from "react";
import { useSignedFileUrl } from "@/lib/storageUrl";

interface SignedCvLinkProps {
  /** Path no bucket privado `candidate-files` ou URL pública legada (compat no helper). */
  cvUrl?: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * Link para o CV do candidato. O bucket `candidate-files` é PRIVADO — resolve o
 * path (ou URL legada) para uma signed URL on-demand. Renderiza só quando a URL
 * está pronta. Seguro para uso em listas (cada instância chama o hook uma vez).
 */
export function SignedCvLink({ cvUrl, className, children }: SignedCvLinkProps) {
  const url = useSignedFileUrl("candidate-files", cvUrl);
  if (!cvUrl || !url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
