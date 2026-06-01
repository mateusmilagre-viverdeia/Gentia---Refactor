import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { Loader2, Lock, Building2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateOrganizationModal } from "@/components/layout/CreateOrganizationModal";

const SECTOR_OPTIONS = [
  { value: "industria", label: "Indústria" },
  { value: "servico", label: "Serviço" },
  { value: "produto_fisico", label: "Venda de Produto Físico" },
  { value: "servico_produto", label: "Serviço e Venda de Produto" },
];

const formatCurrency = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseInt(numbers || "0") / 100;
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const parseCurrency = (value: string): number | null => {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return null;
  return parseInt(numbers) / 100;
};

const numberToCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const MinhaEmpresa = () => {
  const { user } = useAuth();
  const { currentAccount, currentMembership, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [sector, setSector] = useState("");
  const [employeesCount, setEmployeesCount] = useState("");
  const [revenue, setRevenue] = useState("R$ 0,00");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");

  // Permission check - only owner and admin can edit
  const canEdit = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  useEffect(() => {
    if (!orgLoading && currentAccount) {
      loadCompanyData();
    } else if (!orgLoading && !currentAccount) {
      setLoading(false);
    }
  }, [orgLoading, currentAccount]);

  const loadCompanyData = async () => {
    if (!currentAccount) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Use currentAccount directly from OrganizationContext
      setName(currentAccount.name || "");
      setCnpj(currentAccount.cnpj || "");
      setSector(currentAccount.sector || "");
      setEmployeesCount(currentAccount.employees_count?.toString() || "");
      setRevenue(numberToCurrency(currentAccount.revenue_last_12_months));
      setWebsite((currentAccount as any).website || "");
      setInstagram((currentAccount as any).instagram || "");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar");
      return;
    }

    if (!canEdit) {
      toast.error("Você não tem permissão para editar");
      return;
    }

    if (!currentAccount) {
      toast.error("Nenhuma empresa selecionada");
      return;
    }

    if (!name.trim()) {
      toast.error("O nome da empresa é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const companyData = {
        name: name.trim(),
        cnpj: cnpj.trim() || null,
        sector: sector || null,
        employees_count: employeesCount ? parseInt(employeesCount) : null,
        revenue_last_12_months: parseCurrency(revenue),
        website: website.trim() || null,
        instagram: instagram.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("companies")
        .update(companyData)
        .eq("id", currentAccount.id);

      if (error) throw error;

      toast.success("Informações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar informações");
    } finally {
      setSaving(false);
    }
  };

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setRevenue(formatted);
  };

  if (loading) {
    return (
      <AppLayout title="Minha Empresa" breadcrumb={[{ label: "Home", href: "/" }, { label: "Minha Empresa" }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!currentAccount && !loading && !orgLoading) {
    return (
      <AppLayout title="Minha Empresa" breadcrumb={[{ label: "Home", href: "/" }, { label: "Minha Empresa" }]}>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">Você não está vinculado a nenhuma organização</h3>
            <p className="text-muted-foreground">
              Crie sua primeira empresa para começar a usar a plataforma.
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Organização
            </Button>
          </CardContent>
        </Card>
        <CreateOrganizationModal open={modalOpen} onOpenChange={setModalOpen} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Minha Empresa" breadcrumb={[{ label: "Home", href: "/" }, { label: "Minha Empresa" }]}>
      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>
            {canEdit 
              ? "Cadastre e atualize as informações básicas da sua organização"
              : "Visualize as informações da sua organização"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!canEdit && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Apenas proprietários e administradores podem editar estas informações.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Empresa *</Label>
              <Input 
                id="nome" 
                placeholder="Nome da empresa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input 
                id="cnpj" 
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="setor">Setor de Atuação</Label>
              <Select value={sector} onValueChange={setSector} disabled={!canEdit}>
                <SelectTrigger id="setor">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {SECTOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="colaboradores">Número de Colaboradores</Label>
              <Input 
                id="colaboradores" 
                type="number" 
                placeholder="Ex: 50"
                value={employeesCount}
                onChange={(e) => setEmployeesCount(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faturamento">Faturamento (Últimos 12 meses)</Label>
              <Input 
                id="faturamento" 
                placeholder="R$ 0,00"
                value={revenue}
                onChange={handleRevenueChange}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Site da Empresa</Label>
              <Input 
                id="website" 
                type="url"
                placeholder="https://www.suaempresa.com.br"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="instagram">Instagram da Empresa</Label>
              <Input 
                id="instagram" 
                placeholder="@suaempresa"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Informações"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default MinhaEmpresa;
