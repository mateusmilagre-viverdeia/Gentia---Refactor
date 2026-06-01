import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Bloqueia o conteúdo de uma página de entrevista se o usuário autenticado
 * não tiver e-mail no auth.users — sem e-mail o trigger do banco não consegue
 * vincular a sessão ao registro de candidato, gerando candidate_id NULL.
 */
export function RequireCandidateEmail({ children }: { children: ReactNode }) {
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      // Se não está logado (entrevista por token público), libera — backend valida o token.
      if (!data.user) return setHasEmail(true);
      const email = data.user.email?.trim();
      setHasEmail(Boolean(email));
    });
    return () => { mounted = false; };
  }, []);

  if (hasEmail === null) return null;

  if (!hasEmail) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">E-mail necessário para continuar</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sua conta está sem e-mail cadastrado. Para iniciar a entrevista, precisamos de um e-mail válido para identificar você no processo seletivo.
              <br /><br />
              Por favor, faça login novamente usando uma conta de e-mail válida (Google ou cadastro com e-mail e senha).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/candidato/login";
              }}
            >
              Sair e fazer login novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
