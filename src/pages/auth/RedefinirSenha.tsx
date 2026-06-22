import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { translateAuthError } from "@/utils/translateAuthError";
import { clearPasswordRecoverySession, hasPasswordRecoveryUrlParams, isPasswordRecoverySession, markPasswordRecoverySession } from "@/lib/passwordRecovery";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validatePassword, firstFailureMessage } from "@/lib/passwordValidation";

const RedefinirSenha = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingLink, setValidatingLink] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let validationTimer: ReturnType<typeof setTimeout>;
    const arrivedFromRecoveryLink = hasPasswordRecoveryUrlParams();

    const acceptRecoverySession = () => {
      markPasswordRecoverySession();
      setError(null);
      setValidatingLink(false);
    };

    const rejectInvalidLink = () => {
      setError(
        arrivedFromRecoveryLink
          ? "Este link expirou, já foi usado ou não pôde ser validado. Solicite um novo link de recuperação."
          : "Acesse esta página pelo link enviado ao seu email para redefinir a senha."
      );
      setValidatingLink(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        acceptRecoverySession();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && (arrivedFromRecoveryLink || isPasswordRecoverySession())) {
        acceptRecoverySession();
        return;
      }

      validationTimer = setTimeout(rejectInvalidLink, arrivedFromRecoveryLink ? 2500 : 800);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(validationTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const failureMsg = firstFailureMessage(password);
    if (failureMsg) {
      toast({
        title: "Senha não atende às regras",
        description: failureMsg,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
        // A recuperação também satisfaz o gate de troca forçada do cutover: limpa o flag
        // must_change_password (merge no user_metadata), igual ao fluxo de Conta → Perfil.
        data: { must_change_password: false, temporary_password_changed_at: new Date().toISOString() },
      });

      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: translateAuthError(error.message),
          variant: "destructive",
        });
        return;
      }

      setSuccess(true);
      clearPasswordRecoverySession();
      toast({
        title: "Senha redefinida com sucesso!",
        description: "Você será redirecionado para o login.",
      });

      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/auth/login");
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (validatingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <CardTitle className="text-2xl font-semibold">Validando link</CardTitle>
            </div>
            <CardDescription>
              Aguarde enquanto validamos seu link de recuperação de senha...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle className="text-2xl font-semibold">Link inválido</CardTitle>
            </div>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Se você solicitou mais de um email, abra sempre o link mais recente e confira também spam ou lixo eletrônico.
              </p>
              <Button onClick={() => navigate("/auth/esqueci-senha")} className="w-full">
                Solicitar novo link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-semibold">Senha redefinida!</CardTitle>
            </div>
            <CardDescription>
              Sua senha foi alterada com sucesso. Você será redirecionado para o login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Redefinir senha</CardTitle>
          <CardDescription>
            Digite uma nova senha diferente da senha anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem.</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !validatePassword(password).valid || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RedefinirSenha;
