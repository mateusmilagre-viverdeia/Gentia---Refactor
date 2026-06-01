import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Building2, Loader2, Send } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";
import { EmailDomainOrganizationAlert } from "@/components/auth/EmailDomainOrganizationAlert";
import { translateAuthError } from "@/utils/translateAuthError";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validatePassword, firstFailureMessage } from "@/lib/passwordValidation";

interface OrganizationMatch {
  id: string;
  name: string;
}

const Registrar = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<{
    hasInvite: boolean;
    inviteId?: string;
    companyName?: string;
  } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [domainOrganizations, setDomainOrganizations] = useState<OrganizationMatch[]>([]);
  const [showDomainAlert, setShowDomainAlert] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [accessRequestSent, setAccessRequestSent] = useState(false);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const checkPendingInvite = async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    
    setCheckingInvite(true);
    try {
      // Check for pending invites
      const { data, error } = await supabase.functions.invoke('check-pending-invite', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) {
        console.error('Error checking invite:', error);
        return;
      }

      if (data?.hasInvite) {
        setPendingInvite(data);
      } else {
        setPendingInvite(null);
      }

      // Also check for existing organizations with this email domain
      const { data: domainData, error: domainError } = await supabase.functions.invoke('check-email-domain-organization', {
        body: { email: email.toLowerCase().trim() }
      });

      if (domainError) {
        console.error('Error checking domain:', domainError);
        return;
      }

      if (domainData?.has_organization && domainData.organizations?.length > 0) {
        setDomainOrganizations(domainData.organizations);
        setShowDomainAlert(true);
      } else {
        setDomainOrganizations([]);
      }
    } catch (error) {
      console.error('Error checking invite:', error);
    } finally {
      setCheckingInvite(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = "Nome é obrigatório";
    if (!formData.lastName) newErrors.lastName = "Sobrenome é obrigatório";
    if (!formData.email) newErrors.email = "Email é obrigatório";
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email inválido";
    if (!formData.password) {
      newErrors.password = "Senha é obrigatória";
    } else {
      const failureMsg = firstFailureMessage(formData.password);
      if (failureMsg) newErrors.password = failureMsg;
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // If there's a pending invite, redirect to accept invite page
    if (pendingInvite?.hasInvite && pendingInvite.inviteId) {
      navigate(`/app/accept-invite?invite_id=${pendingInvite.inviteId}`);
      return;
    }

    setLoading(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName
    );

    if (error) {
      toast({
        title: "Erro ao criar conta",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Try to auto-accept any pending invite for this email
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && user?.email) {
        const { data } = await supabase.functions.invoke('auto-accept-pending-invite', {
          body: { userId: user.id, email: user.email.toLowerCase().trim() }
        });
        
        if (data?.accepted) {
          toast({
            title: "Conta criada com sucesso!",
            description: `Você foi adicionado à organização ${data.companyName}.`,
          });
          navigate("/");
          return;
        }
      }
    } catch (err) {
      console.error('Error auto-accepting invite:', err);
    }

    toast({
      title: "Conta criada com sucesso!",
      description: "Você já pode fazer login.",
    });
    
    navigate("/auth/login");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value,
    });
    // Clear error when user starts typing
    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }

    // Check for pending invite and domain organizations when email changes
    if (id === 'email') {
      // Clear previous timeout
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
      // Debounce the check
      emailCheckTimeoutRef.current = setTimeout(() => {
        checkPendingInvite(value);
      }, 500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleRequestDomainAccess = async (orgId: string) => {
    setRequestingAccess(true);
    try {
      // For pre-signup, we need a different approach
      // We'll store the request intent and let them complete signup first
      // Then the request will be processed
      toast({
        title: "Para solicitar acesso",
        description: "Complete seu cadastro primeiro. Após o login, você poderá solicitar acesso à organização.",
      });
      setShowDomainAlert(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: translateAuthError(error.message) || "Erro ao processar solicitação",
        variant: "destructive",
      });
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleContinueWithoutOrg = () => {
    setShowDomainAlert(false);
  };

  const handleGoToInvite = () => {
    if (pendingInvite?.inviteId) {
      navigate(`/app/accept-invite?invite_id=${pendingInvite.inviteId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img 
        src={logoGentia} 
        alt="Gent.IA" 
        className="h-36 w-auto mb-6"
      />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Criar conta</CardTitle>
          <CardDescription>
            Crie sua conta no Código de Cultura EP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  placeholder="João"
                  value={formData.firstName}
                  onChange={handleChange}
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
                  value={formData.lastName}
                  onChange={handleChange}
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
                value={formData.email}
                onChange={handleChange}
                required
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Pending Invite Alert */}
            {pendingInvite?.hasInvite && (
              <Alert className="border-primary/50 bg-primary/5">
                <Building2 className="h-4 w-4 text-primary" />
                <AlertDescription className="ml-2">
                  <div className="flex flex-col gap-2">
                    <span>
                      Você tem um convite pendente para <strong>{pendingInvite.companyName}</strong>!
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGoToInvite}
                      className="w-fit"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Aceitar convite
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Domain Organization Alert - show only if no pending invite */}
            {!pendingInvite?.hasInvite && domainOrganizations.length > 0 && showDomainAlert && (
              <EmailDomainOrganizationAlert
                organizations={domainOrganizations}
                onRequestAccess={handleRequestDomainAccess}
                onContinueWithout={handleContinueWithoutOrg}
                loading={requestingAccess}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha forte"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <PasswordStrengthIndicator password={formData.password} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.password !== formData.confirmPassword && !errors.confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem.</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                loading ||
                checkingInvite ||
                !validatePassword(formData.password).valid ||
                formData.password !== formData.confirmPassword
              }
            >
              {loading ? "Criando conta..." : pendingInvite?.hasInvite ? "Ir para o convite" : "Criar conta"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <a href="/auth/login" className="text-foreground hover:underline">
                Entrar
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registrar;
