import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CandidateNavbar } from "@/components/candidate/CandidateNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validatePassword, firstFailureMessage, translatePasswordError } from "@/lib/passwordValidation";
import { translateAuthError } from "@/utils/translateAuthError";

export default function CandidateChangePassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/");
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.user_metadata?.first_name,
        lastName: session.user.user_metadata?.last_name,
      });
    };

    checkAuth();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else {
      const failureMsg = firstFailureMessage(formData.newPassword);
      if (failureMsg) newErrors.newPassword = failureMsg;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: formData.newPassword,
    });

    if (error) {
      toast({
        title: "Erro ao alterar senha",
        description: translatePasswordError(error.message) || translateAuthError(error.message),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Senha alterada com sucesso!",
      description: "Sua senha foi atualizada.",
    });

    navigate("/candidate");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateNavbar user={{ email: user?.email, firstName: user?.firstName, lastName: user?.lastName }} />

      <main className="max-w-lg mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/candidate")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Crie uma senha forte"
                  value={formData.newPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, newPassword: e.target.value });
                    if (errors.newPassword) {
                      setErrors({ ...errors, newPassword: "" });
                    }
                  }}
                />
                <PasswordStrengthIndicator password={formData.newPassword} />
                {errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: "" });
                    }
                  }}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !validatePassword(formData.newPassword).valid ||
                  formData.newPassword !== formData.confirmPassword
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
