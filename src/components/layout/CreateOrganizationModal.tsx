import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DuplicateCompanyAlert, DuplicateMatch } from "@/components/auth/DuplicateCompanyAlert";

const SECTORS = [
  "Tecnologia",
  "Varejo",
  "Indústria",
  "Serviços",
  "Saúde",
  "Educação",
  "Financeiro",
  "Agronegócio",
  "Construção",
  "Logística",
  "Alimentação",
  "Outro",
];

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const { user } = useAuth();
  const { reloadOrganizations, switchOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    sector: "",
  });
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [canCreate, setCanCreate] = useState(true);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const checkForDuplicates = async (): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      const { data, error } = await supabase.functions.invoke('check-company-duplicates', {
        body: {
          name: formData.name.trim(),
          cnpj: formData.cnpj.trim() || undefined,
          user_email: user.email,
        },
      });

      if (error) {
        console.error("Error checking duplicates:", error);
        return false;
      }

      if (data?.has_duplicates && data.matches?.length > 0) {
        setDuplicateMatches(data.matches);
        setCanCreate(data.can_create !== false);
        setRequiresConfirmation(data.requires_confirmation === true);
        setShowDuplicateAlert(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking duplicates:", error);
      return false;
    }
  };

  const createOrganization = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setLoading(true);

    try {
      // Create the company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: formData.name.trim(),
          cnpj: formData.cnpj.trim() || null,
          sector: formData.sector || null,
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create membership as owner
      const { error: memberError } = await supabase
        .from("account_members")
        .insert({
          account_id: company.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      // Create org_billing with 15-day trial period
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);

      const { error: billingError } = await supabase
        .from("org_billing")
        .insert({
          org_id: company.id,
          status: "trialing",
          trial_start: new Date().toISOString(),
          trial_end: trialEndDate.toISOString(),
        });

      if (billingError) {
        console.error("Error creating billing record:", billingError);
      }

      toast.success("Organização criada com sucesso! Você tem 15 dias de teste grátis.");

      // Reset form
      setFormData({ name: "", cnpj: "", sector: "" });
      onOpenChange(false);

      // Reload organizations and switch to new one
      await reloadOrganizations();
      switchOrganization(company.id);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error.message || "Erro ao criar organização");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Nome da organização é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const hasDuplicates = await checkForDuplicates();
      if (hasDuplicates) {
        setLoading(false);
        return;
      }

      await createOrganization();
    } catch (error) {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (orgId: string, reason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('request-org-access', {
        body: { org_id: orgId, reason },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Solicitação enviada! Os administradores serão notificados.");
      setShowDuplicateAlert(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error requesting access:", error);
      toast.error(error.message || "Erro ao enviar solicitação");
      throw error;
    }
  };

  const handleCreateAnyway = async () => {
    setShowDuplicateAlert(false);
    await createOrganization();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Nova Organização
          </DialogTitle>
          <DialogDescription>
            Crie uma nova organização para gerenciar separadamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Organização *</Label>
            <Input
              id="name"
              placeholder="Ex: Minha Empresa Ltda"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector">Setor (opcional)</Label>
            <Select
              value={formData.sector}
              onValueChange={(value) => setFormData({ ...formData, sector: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Organização"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <DuplicateCompanyAlert
        open={showDuplicateAlert}
        onOpenChange={setShowDuplicateAlert}
        matches={duplicateMatches}
        companyName={formData.name}
        onRequestAccess={handleRequestAccess}
        onCreateAnyway={handleCreateAnyway}
        loading={loading}
        canCreate={canCreate}
        requiresConfirmation={requiresConfirmation}
      />
    </Dialog>
  );
}
