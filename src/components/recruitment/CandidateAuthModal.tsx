import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logoGentia from "@/assets/logo-gentia-black.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { translateAuthError } from "@/utils/translateAuthError";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validatePassword, firstFailureMessage } from "@/lib/passwordValidation";

interface CandidateAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (isNewAccount?: boolean) => void;
  jobTitle: string;
  /** ID da vaga — usado para verificar divergência de e-mail */
  jobId?: string;
  /** account_id da empresa dona da vaga */
  accountId?: string;
}

export function CandidateAuthModal({
  open,
  onOpenChange,
  onSuccess,
  jobTitle,
  jobId,
  accountId,
}: CandidateAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({});
  };

  /** Verifica se existe candidato cadastrado na vaga com e-mail diferente do logado */
  const checkEmailMismatch = async (loggedEmail: string) => {
    if (!jobId || !accountId) return;
    try {
      // Buscar candidatos vinculados a esta vaga via applications
      const { data: apps } = await supabase
        .from("recruitment_applications")
        .select("candidate_id")
        .eq("job_id", jobId);

      if (!apps || apps.length === 0) return; // candidato orgânico, sem registro prévio

      const candidateIds = apps.map((a) => a.candidate_id);
      const { data: candidates } = await supabase
        .from("recruitment_candidates")
        .select("id, email")
        .in("id", candidateIds);

      if (!candidates || candidates.length === 0) return;

      const mismatch = candidates.find(
        (c) => c.email && c.email.toLowerCase() !== loggedEmail.toLowerCase()
      );

      if (mismatch) {
        toast({
          title: "Atenção: e-mail diferente detectado",
          description: `Identificamos que você foi convidado com o e-mail ${mismatch.email}. Para evitar problemas, faça login com esse e-mail.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("[CandidateAuthModal] Email mismatch check failed:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      toast({
        title: "Erro ao fazer login",
        description: translateAuthError(error),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Verificar divergência de e-mail
    await checkEmailMismatch(loginEmail);

    toast({
      title: "Login realizado com sucesso!",
      description: "Agora você pode se candidatar à vaga.",
    });
    
    resetForms();
    onSuccess(false);
  };

  const validateRegisterForm = () => {
    const newErrors: Record<string, string> = {};

    if (!registerData.firstName) newErrors.firstName = "Nome é obrigatório";
    if (!registerData.lastName) newErrors.lastName = "Sobrenome é obrigatório";
    if (!registerData.email) newErrors.email = "Email é obrigatório";
    if (!/\S+@\S+\.\S+/.test(registerData.email)) newErrors.email = "Email inválido";
    if (!registerData.password) {
      newErrors.password = "Senha é obrigatória";
    } else {
      const pwError = firstFailureMessage(registerData.password);
      if (pwError) newErrors.password = pwError;
    }
    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) {
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        emailRedirectTo: window.location.href,
        data: {
          first_name: registerData.firstName,
          last_name: registerData.lastName,
        },
      },
    });

    if (error) {
      toast({
        title: "Erro ao criar conta",
        description: translateAuthError(error),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Assign candidate role using database function
    if (data.user) {
      await supabase.rpc('assign_candidate_role', { p_user_id: data.user.id });
    }

    toast({
      title: "Conta criada com sucesso!",
      description: "Complete seu perfil para se candidatar.",
    });

    resetForms();
    onSuccess(true); // New account - should redirect to biography
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setRegisterData({
      ...registerData,
      [id]: value,
    });
    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* Logo GENTIA - pequena e minimalista */}
          <div className="flex justify-center mb-3">
            <a 
              href="https://gentia.lovable.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <img 
                src={logoGentia} 
                alt="GENT.IA" 
                className="h-4 w-auto"
              />
            </a>
          </div>
          <DialogTitle>Candidatar-se à vaga</DialogTitle>
          <DialogDescription>
            Para se candidatar à vaga de <strong>{jobTitle}</strong>, faça login ou crie uma conta.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loginPassword">Senha</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="text-center text-sm">
                <a 
                  href="/auth/esqueci-senha" 
                  target="_blank"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Esqueci minha senha
                </a>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    placeholder="João"
                    value={registerData.firstName}
                    onChange={handleRegisterChange}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    placeholder="Silva"
                    value={registerData.lastName}
                    onChange={handleRegisterChange}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  required
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  required
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                {(registerData.password.length > 0 && !validatePassword(registerData.password).valid) && (
                  <PasswordStrengthIndicator password={registerData.password} />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
