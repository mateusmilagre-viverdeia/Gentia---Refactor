import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { translateAuthError } from "@/utils/translateAuthError";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitLockedRef = useRef(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockedRef.current || loading || submitted) return;

    submitLockedRef.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("request-password-recovery", {
        body: { email, source: "public" },
      });

      if (error) {
        submitLockedRef.current = false;
        toast({
          title: "Erro ao enviar email",
          description: translateAuthError(error.message),
          variant: "destructive",
        });
        return;
      }

      setSubmitted(true);
    } catch (error) {
      submitLockedRef.current = false;
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Email enviado</CardTitle>
            <CardDescription>
              Se existe uma conta com este email, você receberá instruções para redefinir sua senha. Verifique também spam ou lixo eletrônico e use sempre o link mais recente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/auth/login"} className="w-full">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Esqueci minha senha</CardTitle>
          <CardDescription>
            Digite seu email para receber instruções de recuperação de senha. O link expira por segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar instruções"
              )}
            </Button>

            <div className="text-center text-sm">
              <a href="/auth/login" className="text-muted-foreground hover:text-foreground">
                Voltar para login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EsqueciSenha;
