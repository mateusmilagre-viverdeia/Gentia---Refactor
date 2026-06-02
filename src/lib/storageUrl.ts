import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve uma **signed URL** para um objeto em bucket PRIVADO do Storage.
 *
 * Aceita tanto um path puro (`"<uid>/cv.pdf"`) quanto uma URL pública legada
 * (`"https://.../object/public/<bucket>/<uid>/cv.pdf"`) — extrai o path e gera
 * a URL assinada. Isso é importante no cutover: registros antigos guardavam a
 * URL pública completa em `avatar_url`/`cv_url`; novos registros guardam o path.
 *
 * Buckets privados (ex.: `candidate-files`) não funcionam com `getPublicUrl`;
 * use sempre este helper para servir o arquivo a quem tem permissão (a leitura
 * é controlada pelas policies de `storage.objects`).
 */
export async function getSignedFileUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  let path = pathOrUrl;

  if (/^https?:\/\//i.test(path)) {
    const publicMarker = `/object/public/${bucket}/`;
    const signMarker = `/object/sign/${bucket}/`;
    const pi = path.indexOf(publicMarker);
    const si = path.indexOf(signMarker);
    if (pi !== -1) {
      path = path.substring(pi + publicMarker.length);
    } else if (si !== -1) {
      path = path.substring(si + signMarker.length).split("?")[0];
    } else {
      // URL de outro domínio/bucket — devolve como está (não dá pra assinar)
      return pathOrUrl;
    }
    path = decodeURIComponent(path);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`getSignedFileUrl(${bucket}) falhou:`, error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Hook reativo para exibir um arquivo de bucket privado (ex.: avatar em <img>).
 * Regenera a signed URL quando o path muda. Retorna `null` enquanto resolve.
 */
export function useSignedFileUrl(
  bucket: string,
  pathOrUrl?: string | null,
  expiresIn = 3600,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    getSignedFileUrl(bucket, pathOrUrl, expiresIn).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [bucket, pathOrUrl, expiresIn]);

  return url;
}
