import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { Building2, CheckCircle, Loader2, Lock, UserPlus } from "lucide-react";
import { getTranslatedErrorMessage } from "@/utils/translateAuthError";
import { toast } from "sonner";
import logoGentia from "@/assets/logo-gentia.png";

type AccessLevel = "full" | "view_only" | "disabled";

interface PregrantPreview {
  valid: boolean;
  pregrant_id?: string;
  expires_at?: string;
  free_seats?: number;
  masked_cnpj?: string;
  company?: { id: string; name: string } | null;
  permission_template?: { id: string; name: string } | null;
  message?: string;
}

export default function ClaimGrant() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PregrantPreview | null>(null);
  const [processing, setProcessing] = useState(false);

  // Login/signup state (hybrid)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const hasToken = useMemo(() => token.trim().length > 0, [token]);

  useEffect(() => {
    const run = async () => {
      if (!hasToken) {
        setPreview({ valid: false, message: "Token não fornecido." });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("validate-pregrant", {
          body: { token },
        });

        if (error) throw error;
        setPreview(data as PregrantPreview);
      } catch (err) {
        console.error("validate-pregrant error", err);
        setPreview({ valid: false, message: "Não foi possível validar o link." });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [hasToken, token]);

  const handleClaim = async () => {
    if (!token) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("claim-pregrant", {
        body: { token },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success("Acesso aplicado com sucesso!");
      navigate("/");
    } catch (err: any) {
      console.error("claim-pregrant error", err);
      toast.error(getTranslatedErrorMessage(err, "Erro ao aplicar acesso."));
    } finally {
      setProcessing(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Informe email e senha.");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      await handleClaim();
    } catch (err: any) {
      console.error("login error", err);
      toast.error(getTranslatedErrorMessage(err, "Erro ao entrar."));
    } finally {
      setProcessing(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Preencha nome e sobrenome.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setProcessing(true);
    try {
      // Backend creates the user (auto-confirm) and returns login email
      const { data, error } = await supabase.functions.invoke("claim-pregrant", {
        body: {
          token,
          signup: {
            email: email.trim(),
            password,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const loginEmail = (data as any)?.email || email.trim();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (signInError) {
        toast.success("Conta criada! Faça login para continuar.");
        navigate(`/auth/login?email=${encodeURIComponent(loginEmail)}`);
        return;
      }

      toast.success("Conta criada e acesso aplicado!");
      navigate("/");
    } catch (err: any) {
      console.error("signup error", err);
      toast.error(getTranslatedErrorMessage(err, "Erro ao criar conta."));
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preview?.valid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>{preview?.message || "Este link não é mais válido."}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/auth/login")}>Ir para Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Ativar Acesso</CardTitle>
          <CardDescription>
            Conclua para liberar o acesso desta organização.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Organização</span>
              <span className="text-sm font-medium text-foreground">
                {preview.company?.name || "Nova organização"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">CNPJ</span>
              <span className="text-sm font-medium text-foreground">
                {preview.masked_cnpj || "***"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Assentos</span>
              <span className="text-sm font-medium text-foreground">
                {typeof preview.free_seats === "number" ? preview.free_seats : 0}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Validade</span>
              <span className="text-sm font-medium text-foreground">
                {preview.expires_at ? new Date(preview.expires_at).toLocaleDateString("pt-BR") : "-"}
              </span>
            </div>

            {preview.permission_template?.name ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Template</span>
                <span className="text-sm font-medium text-foreground">
                  {preview.permission_template.name}
                </span>
              </div>
            ) : null}
          </div>

          {user ? (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  Você está logado como <strong>{user.email}</strong>.
                </AlertDescription>
              </Alert>

              <Button className="w-full" onClick={handleClaim} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando acesso...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir e Entrar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
                <TabsTrigger value="login">Entrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signup" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={processing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={processing} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={processing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={processing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={processing} />
                </div>

                <Button className="w-full" onClick={handleSignup} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar Conta e Ativar
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="login" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input id="loginEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={processing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Senha</Label>
                  <Input id="loginPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={processing} />
                </div>
                <Button className="w-full" onClick={handleLogin} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Entrar e Ativar
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
