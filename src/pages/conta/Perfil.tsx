import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserCog } from "lucide-react";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { useAccount } from "@/hooks/useAccount";
import { ImpersonationUserSelect } from "@/components/impersonation";
import { SessionResetCard } from "@/components/profile/SessionResetCard";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Perfil = () => {
  const { user } = useAuth();
  const { isOwner } = useAccount();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const mustChangePassword = user?.user_metadata?.must_change_password === true;

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          email: data.email || user.email || "",
        });
      } else {
        // Profile doesn't exist, use auth user email
        setFormData({
          firstName: "",
          lastName: "",
          email: user.email || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar seus dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = formData.firstName?.[0] || "";
    const last = formData.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Upsert profile data
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (error) throw error;

      if (mustChangePassword) {
        await supabase.auth.updateUser({
          data: { ...user?.user_metadata, must_change_password: false, temporary_password_changed_at: new Date().toISOString() },
        });
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmNewPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a nova senha e a confirmação.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar sua senha.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Meu Perfil" breadcrumb={[{ label: "Home", href: "/" }, { label: "Conta" }, { label: "Meu Perfil" }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meu Perfil" breadcrumb={[{ label: "Home", href: "/" }, { label: "Conta" }, { label: "Meu Perfil" }]}>
      <div className="space-y-6">
        {mustChangePassword && (
          <Alert>
            <UserCog className="h-4 w-4" />
            <AlertDescription>
              Você entrou com uma senha temporária. Por segurança, altere sua senha agora.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informações do Perfil</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-medium">
                {getInitials()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado diretamente.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Mantenha sua conta segura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input 
                id="newPassword" 
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
              <Input 
                id="confirmNewPassword" 
                type="password"
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
              />
            </div>

            <Button variant="outline" onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>

        <TwoFactorSettings />

        <SessionResetCard />

        {isOwner && (
          <Card id="impersonation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Assumir Identidade
              </CardTitle>
              <CardDescription>
                Visualize o sistema como outro usuário da sua conta para suporte e debugging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImpersonationUserSelect />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Perfil;
