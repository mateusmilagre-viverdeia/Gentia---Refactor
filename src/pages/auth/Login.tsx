import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTwoFactor } from "@/hooks/useTwoFactor";
import { TwoFactorVerify } from "@/components/auth/TwoFactorVerify";
import { supabase } from "@/integrations/supabase/client";
import logoGentia from "@/assets/logo-gentia.png";
import { translateAuthError } from "@/utils/translateAuthError";

const Login = () => {
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const inviteId = searchParams.get("invite");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const { checkMfaRequired } = useTwoFactor();

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const autoAcceptPendingInvite = async (userId: string, userEmail: string) => {
    try {
      console.log('[Login] Checking for pending invites for:', userEmail);
      
      const { data, error } = await supabase.functions.invoke('auto-accept-pending-invite', {
        body: { userId, email: userEmail }
      });

      if (error) {
        console.error('[Login] Error auto-accepting invite:', error);
        return;
      }

      if (data?.accepted) {
        toast({
          title: "Convite aceito automaticamente!",
          description: `Você foi adicionado à organização ${data.companyName}.`,
        });
      }
    } catch (error) {
      console.error('[Login] Error auto-accepting invite:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      const baseMsg = translateAuthError(error.message);
      const hint = inviteId
        ? " Lembre-se: se você já tinha conta, use a SUA SENHA ATUAL (a senha digitada na tela do convite não foi salva). Se não lembrar, clique em 'Esqueci minha senha'."
        : "";
      toast({
        title: "Erro ao fazer login",
        description: baseMsg + hint,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if MFA is required
    const mfaRequired = await checkMfaRequired();
    
    if (mfaRequired) {
      setLoading(false);
      setShowMfaVerify(true);
      return;
    }

    // Get user info and try to auto-accept any pending invites
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id && currentUser?.email) {
      await autoAcceptPendingInvite(currentUser.id, currentUser.email);
    }

    // Check if user is a candidate
    if (currentUser?.id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .eq("role", "candidate")
        .limit(1);

      if (roles && roles.length > 0) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        navigate("/candidate");
        return;
      }
    }

    toast({
      title: "Login realizado com sucesso!",
      description: "Redirecionando...",
    });
    
    navigate("/");
  };

  const handleMfaSuccess = async () => {
    // Get user info and try to auto-accept any pending invites
    const { data: { user: mfaUser } } = await supabase.auth.getUser();
    if (mfaUser?.id && mfaUser?.email) {
      await autoAcceptPendingInvite(mfaUser.id, mfaUser.email);
    }

    // Check if user is a candidate
    if (mfaUser?.id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", mfaUser.id)
        .eq("role", "candidate")
        .limit(1);

      if (roles && roles.length > 0) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        navigate("/candidate");
        return;
      }
    }

    toast({
      title: "Login realizado com sucesso!",
      description: "Redirecionando...",
    });
    navigate("/");
  };

  const handleMfaCancel = async () => {
    setShowMfaVerify(false);
    setEmail("");
    setPassword("");
  };

  if (showMfaVerify) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img 
          src={logoGentia} 
          alt="Gent.IA" 
          className="h-36 w-auto mb-6"
        />
        <TwoFactorVerify 
          onSuccess={handleMfaSuccess} 
          onCancel={handleMfaCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img 
        src={logoGentia} 
        alt="Gent.IA" 
        className="h-36 w-auto mb-6"
      />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Entrar</CardTitle>
          <CardDescription>
            Acesse sua conta do Código de Cultura EP
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteId && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Você foi convidado para uma equipe. Use a sua <strong>senha atual</strong> para entrar — após o login, o convite será aceito automaticamente. Se você não lembra a senha (ou nunca acessou), use <a href={`/auth/esqueci-senha?email=${encodeURIComponent(email)}`} className="underline font-medium">Esqueci minha senha</a>.
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center space-y-2 text-sm">
              <a href="/auth/esqueci-senha" className="text-muted-foreground hover:text-foreground">
                Esqueci minha senha
              </a>
              <div>
                <span className="text-muted-foreground">Não tem uma conta? </span>
                <a href="/auth/registrar" className="text-foreground hover:underline">
                  Criar conta
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
