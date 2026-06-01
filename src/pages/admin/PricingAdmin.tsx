import { useOrganization } from "@/contexts/OrganizationContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlansAndPackagesTab } from "@/components/admin/pricing/PlansAndPackagesTab";
import { PricingTableTab } from "@/components/admin/pricing/PricingTableTab";
import { LLMCostsTab } from "@/components/admin/pricing/LLMCostsTab";
import { LLMMarginMatrixTab } from "@/components/admin/pricing/LLMMarginMatrixTab";
import { PricingSimulatorTab } from "@/components/admin/pricing/PricingSimulatorTab";
import { ValidationTab } from "@/components/admin/pricing/ValidationTab";
import { Building2, Zap, Cpu, Sparkles, ShieldCheck, DollarSign, TrendingUp } from "lucide-react";

const EP_PARTNERS_ACCOUNT_ID = "67f66f7a-d9a8-455e-8820-ee836cfe7401";

export default function PricingAdmin() {
  const { currentAccount, loading } = useOrganization();
  const { isSuperAdmin, loading: loadingSA } = useSuperAdmin();

  if (!loading && !loadingSA && !isSuperAdmin && currentAccount?.id !== EP_PARTNERS_ACCOUNT_ID) {
    return (
      <AppLayout title="Pricing & Créditos">
        <AccessDenied title="Acesso Restrito" description="Esta área é exclusiva para administradores da EP Partners." />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Pricing & Créditos"
      breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Pricing & Créditos" }]}
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Pricing & Créditos</h1>
            <p className="text-sm text-muted-foreground">
              Planos, tabela de preços, custos reais de LLM e simulador — tudo num só lugar.
            </p>
          </div>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="plans" className="gap-2"><Building2 className="h-4 w-4" />Planos & Pacotes</TabsTrigger>
            <TabsTrigger value="table" className="gap-2"><Zap className="h-4 w-4" />Tabela de Preços</TabsTrigger>
            <TabsTrigger value="llm" className="gap-2"><Cpu className="h-4 w-4" />Custos LLM</TabsTrigger>
            <TabsTrigger value="margin" className="gap-2"><TrendingUp className="h-4 w-4" />Margem LLM</TabsTrigger>
            <TabsTrigger value="simulator" className="gap-2"><Sparkles className="h-4 w-4" />Simulador</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><ShieldCheck className="h-4 w-4" />Auditoria</TabsTrigger>
          </TabsList>
          <TabsContent value="plans"><PlansAndPackagesTab /></TabsContent>
          <TabsContent value="table"><PricingTableTab /></TabsContent>
          <TabsContent value="llm"><LLMCostsTab /></TabsContent>
          <TabsContent value="margin"><LLMMarginMatrixTab /></TabsContent>
          <TabsContent value="simulator"><PricingSimulatorTab /></TabsContent>
          <TabsContent value="audit"><ValidationTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
