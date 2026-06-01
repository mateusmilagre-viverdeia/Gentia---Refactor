import { useState } from "react";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DuplicateCompanyAlert, DuplicateMatch } from "./DuplicateCompanyAlert";

const SECTORS = [
  "Tecnologia", "Varejo", "Indústria", "Serviços", "Saúde", "Educação",
  "Financeiro", "Agronegócio", "Construção", "Logística", "Alimentação", "Outro",
];

export function CreateFirstOrganizationModal() {
  const { user } = useAuth();
  const { reloadOrganizations, switchOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", cnpj: "", sector: "" });
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [accessRequestSent, setAccessRequestSent] = useState(false);
  const [canCreate, setCanCreate] = useState(true);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const checkForDuplicates = async (): Promise<boolean> => {
    if (!user?.email) return false;
    try {
      const { data, error } = await supabase.functions.invoke('check-company-duplicates', {
        body: { name: formData.name.trim(), cnpj: formData.cnpj.trim() || undefined, user_email: user.email },
      });
      if (error) return false;
      if (data?.has_duplicates && data.matches?.length > 0) {
        setDuplicateMatches(data.matches);
        setCanCreate(data.can_create !== false);
        setRequiresConfirmation(data.requires_confirmation === true);
        setShowDuplicateAlert(true);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const createOrganization = async () => {
    if (!user) { toast.error("Você precisa estar logado"); return; }
    setLoading(true);
    try {
      const { data: company, error: companyError } = await supabase.from("companies")
        .insert({ name: formData.name.trim(), cnpj: formData.cnpj.trim() || null, sector: formData.sector || null, user_id: user.id, status: "active" })
        .select().single();
      if (companyError) throw companyError;

      await supabase.from("account_members").insert({ account_id: company.id, user_id: user.id, role: "owner" });
      
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);
      await supabase.from("org_billing").insert({ org_id: company.id, status: "trialing", trial_start: new Date().toISOString(), trial_end: trialEndDate.toISOString() });

      // Only update profiles.account_id if user doesn't have one yet (first organization)
      const { data: profile } = await supabase.from("profiles").select("account_id").eq("id", user.id).single();
      if (!profile?.account_id) {
        await supabase.from("profiles").update({ account_id: company.id }).eq("id", user.id);
      }

      toast.success("Organização criada com sucesso! Você tem 15 dias de teste grátis.");
      await reloadOrganizations();
      switchOrganization(company.id);
    } catch (error: any) {
      console.error("Failed to create organization:", error);
      toast.error("Não foi possível criar a organização agora. Tente novamente em instantes ou fale com o suporte.");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Você precisa estar logado"); return; }
    if (!formData.name.trim()) { toast.error("Nome da organização é obrigatório"); return; }
    setLoading(true);
    const hasDuplicates = await checkForDuplicates();
    if (hasDuplicates) { setLoading(false); return; }
    await createOrganization();
  };

  const handleRequestAccess = async (orgId: string, reason?: string) => {
    const { data, error } = await supabase.functions.invoke('request-org-access', { body: { org_id: orgId, reason } });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    toast.success("Solicitação enviada!");
    setAccessRequestSent(true);
    setShowDuplicateAlert(false);
  };

  const handleCreateAnyway = async () => { setShowDuplicateAlert(false); await createOrganization(); };

  if (accessRequestSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Solicitação Enviada!</CardTitle>
            <CardDescription className="text-base">Você receberá um email quando sua solicitação for processada.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => setAccessRequestSent(false)} className="mt-4">Criar outra organização</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo à Plataforma!</CardTitle>
          <CardDescription className="text-base">Para começar, cadastre sua primeira organização.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1"><Building2 className="h-4 w-4" />Nome da Organização *</Label>
              <Input id="name" placeholder="Ex: Minha Empresa Ltda" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={loading} autoFocus className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (opcional)</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} disabled={loading} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Setor (opcional)</Label>
              <Select value={formData.sector} onValueChange={(value) => setFormData({ ...formData, sector: value })} disabled={loading}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>{SECTORS.map((sector) => (<SelectItem key={sector} value={sector}>{sector}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 text-base">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>) : "Criar Organização e Começar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <DuplicateCompanyAlert open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert} matches={duplicateMatches} companyName={formData.name} onRequestAccess={handleRequestAccess} onCreateAnyway={handleCreateAnyway} loading={loading} canCreate={canCreate} requiresConfirmation={requiresConfirmation} />
    </div>
  );
}
