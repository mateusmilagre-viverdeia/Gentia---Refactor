import { AppLayout } from "@/components/layout/AppLayout";
import { Target, Megaphone } from "lucide-react";
import { VendendoEmpresaTab } from "@/components/atracao/VendendoEmpresaTab";
import { PageGamificationBanner } from "@/components/gamification";

export default function Atracao() {
  return (
    <AppLayout title="Atração" breadcrumb={[{ label: "Home", href: "/" }, { label: "Atração e Contratação", href: "/atracao-contratacao" }, { label: "Atração" }]}>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <PageGamificationBanner journeyId="atracao" stepId="vendendo_empresa" />
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="h-8 w-8" />
            <h1 className="text-3xl font-semibold tracking-tight">Vendendo a Empresa</h1>
          </div>
          <p className="text-muted-foreground">
            Ferramentas para atrair os melhores talentos alinhados com sua cultura organizacional.
          </p>
        </div>

        <VendendoEmpresaTab />
      </div>
    </AppLayout>
  );
}
